import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_PRICING_POLICY,
  LocalDataService,
  LocalOrderSessionService,
  LocalSharingService,
  ORDER_SESSION_STATUS,
  PARTICIPANT_RESPONSE,
  type Bucket,
  type SessionUser,
} from '@/modules/data-access';

const owner: SessionUser = {
  id: 'owner-1',
  email: 'owner@example.com',
  displayName: 'Owner',
  isDemo: true,
};
const contributor: SessionUser = {
  id: 'contributor-1',
  email: 'contributor@example.com',
  displayName: 'Contributor',
  isDemo: true,
};
const viewer: SessionUser = {
  id: 'viewer-1',
  email: 'viewer@example.com',
  displayName: 'Viewer',
  isDemo: true,
};

const bucketDraft = (unitPrice = 100) => ({
  title: 'Office breakfast',
  description: 'Reusable menu',
  currency: 'EGP' as const,
  pricingPolicy: {
    ...DEFAULT_PRICING_POLICY,
    vatBasisPoints: 1_400,
    serviceBasisPoints: 1_200,
    deliveryMinor: 2_000,
  },
  customItemMode: 'proposal' as const,
  items: [
    {
      id: 'meal',
      name: 'Meal',
      description: '',
      category: 'Main',
      unitPrice,
      active: true,
    },
    {
      id: 'drink',
      name: 'Drink',
      description: '',
      category: 'Drinks',
      unitPrice: 25,
      active: true,
    },
  ],
});

const services = () => ({
  data: new LocalDataService(),
  sharing: new LocalSharingService(),
  sessions: new LocalOrderSessionService(),
});

const createSharedBucket = async (
  role: 'contributor' | 'viewer' = 'contributor',
): Promise<{ bucket: Bucket; member: SessionUser }> => {
  const service = services();
  const saved = await service.data.saveBucket(owner, bucketDraft());
  const bucket = await service.sharing.enableSharing(owner, saved.id);
  const invitation = await service.sharing.createInvite(owner, bucket.id, role);
  const member = role === 'viewer' ? viewer : contributor;
  await service.sharing.acceptJoinCode(member, invitation.joinCode);
  return { bucket, member };
};

beforeEach(() => {
  localStorage.clear();
});

describe('LocalOrderSessionService', () => {
  it('creates an independent collecting session with privacy-minimal participants', async () => {
    const { bucket } = await createSharedBucket();
    const service = services();
    const session = await service.sessions.createSession(owner, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
      deadlineAt: '2099-07-18T10:00:00.000Z',
      autoLock: true,
    });
    const view = await service.sessions.getSessionView(owner, session.id);

    expect(session).toMatchObject({
      menuTemplateId: bucket.id,
      sourceMenuRevision: bucket.revision,
      status: ORDER_SESSION_STATUS.collecting,
      revision: 2,
      autoLock: true,
      aggregate: {},
    });
    expect(view?.participants).toHaveLength(2);
    expect(view?.participants.map((participant) => participant.userId)).toEqual([
      owner.id,
      contributor.id,
    ]);
    expect(view?.participants[0]).not.toHaveProperty('email');
    expect(view?.session.menuItems.map((item) => item.unitPriceMinor)).toEqual([
      10_000,
      2_500,
    ]);
  });

  it('keeps the live menu snapshot unchanged after the template is edited', async () => {
    const { bucket } = await createSharedBucket();
    const service = services();
    const session = await service.sessions.createSession(owner, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
    });
    await service.data.saveBucket(owner, bucketDraft(250), bucket.id);

    const view = await service.sessions.getSessionView(owner, session.id);
    expect(view?.session.menuItems[0]?.unitPriceMinor).toBe(10_000);
    expect(view?.session.sourceMenuRevision).toBe(bucket.revision);
  });

  it('suppresses duplicate recurring occurrences', async () => {
    const { bucket } = await createSharedBucket();
    const service = services();
    const input = {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
      scheduleOccurrenceKey: 'weekday-breakfast:2026-07-19',
    };

    await service.sessions.createSession(owner, input);
    await expect(service.sessions.createSession(owner, input)).rejects.toThrow(
      /already exists/,
    );
  });

  it('lists sessions only for the organizer and active participant', async () => {
    const { bucket } = await createSharedBucket();
    const service = services();
    const session = await service.sessions.createSession(owner, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
    });

    expect((await service.sessions.listSessions(owner)).map((item) => item.id)).toEqual([
      session.id,
    ]);
    expect(
      (await service.sessions.listSessions(contributor)).map((item) => item.id),
    ).toEqual([session.id]);
    expect(await service.sessions.listSessions(viewer)).toEqual([]);
    expect(await service.sessions.getSessionView(viewer, session.id)).toBeNull();
  });

  it('updates participant status with both session and participant revisions', async () => {
    const { bucket } = await createSharedBucket();
    const service = services();
    const session = await service.sessions.createSession(owner, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
    });
    const initialView = await service.sessions.getSessionView(contributor, session.id);
    const participant = initialView?.currentParticipant;
    expect(participant).not.toBeNull();

    const done = await service.sessions.updateParticipantResponse(contributor, {
      sessionId: session.id,
      expectedSessionRevision: session.revision,
      expectedParticipantRevision: participant?.revision ?? 0,
      response: PARTICIPANT_RESPONSE.done,
    });
    const updatedView = await service.sessions.getSessionView(owner, session.id);

    expect(done).toMatchObject({
      response: PARTICIPANT_RESPONSE.done,
      includeInFinalOrder: true,
      revision: 2,
    });
    expect(updatedView?.session.responseSummary).toMatchObject({
      pending: 1,
      done: 1,
      eligibleForFinalization: 1,
    });
    await expect(
      service.sessions.updateParticipantResponse(contributor, {
        sessionId: session.id,
        expectedSessionRevision: session.revision,
        expectedParticipantRevision: done.revision,
        response: PARTICIPANT_RESPONSE.skipped,
      }),
    ).rejects.toThrow(/changed/);
  });

  it('persists contribution aggregate and expected minor-unit total', async () => {
    const { bucket } = await createSharedBucket();
    const service = services();
    const session = await service.sessions.createSession(owner, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
    });
    const record = await service.sessions.updateContribution(contributor, {
      sessionId: session.id,
      expectedSessionRevision: session.revision,
      itemId: 'meal',
      operation: 'set',
      value: 2,
      mutationId: 'mutation-1',
    });
    const view = await service.sessions.getSessionView(owner, session.id);

    expect(record).toMatchObject({
      appliedDelta: 2,
      resultQuantity: 2,
      resultRevision: 1,
    });
    expect(view?.session.aggregate).toEqual({ meal: 2 });
    expect(view?.session.settlementSummary).toMatchObject({
      participantCount: 1,
      expectedGrandTotalMinor: 27_200,
      outstandingGrandTotalMinor: 27_200,
    });
    expect(view?.currentParticipant?.userId).toBe(owner.id);
    expect(
      view?.participants.find((participant) => participant.userId === contributor.id),
    ).toMatchObject({ response: PARTICIPANT_RESPONSE.ordering });
  });

  it('denies stale, viewer, unavailable-item, and non-organizer mutations', async () => {
    const { bucket } = await createSharedBucket('viewer');
    const service = services();
    const session = await service.sessions.createSession(owner, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
    });

    await expect(
      service.sessions.updateContribution(viewer, {
        sessionId: session.id,
        expectedSessionRevision: session.revision,
        itemId: 'meal',
        operation: 'set',
        value: 1,
        mutationId: 'viewer-mutation',
      }),
    ).rejects.toThrow(/permission/);
    await expect(
      service.sessions.updateContribution(owner, {
        sessionId: session.id,
        expectedSessionRevision: session.revision,
        itemId: 'missing',
        operation: 'set',
        value: 1,
        mutationId: 'missing-item',
      }),
    ).rejects.toThrow(/not available/);
    await expect(
      service.sessions.transitionSession(viewer, {
        sessionId: session.id,
        expectedRevision: session.revision,
        nextStatus: ORDER_SESSION_STATUS.locked,
      }),
    ).rejects.toThrow(/organizer/);
    await expect(
      service.sessions.transitionSession(owner, {
        sessionId: session.id,
        expectedRevision: 1,
        nextStatus: ORDER_SESSION_STATUS.locked,
      }),
    ).rejects.toThrow(/changed/);
  });

  it('locks an order and blocks later contributions', async () => {
    const { bucket } = await createSharedBucket();
    const service = services();
    const session = await service.sessions.createSession(owner, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
    });
    const locked = await service.sessions.transitionSession(owner, {
      sessionId: session.id,
      expectedRevision: session.revision,
      nextStatus: ORDER_SESSION_STATUS.locked,
    });

    expect(locked.status).toBe(ORDER_SESSION_STATUS.locked);
    await expect(
      service.sessions.updateContribution(contributor, {
        sessionId: session.id,
        expectedSessionRevision: locked.revision,
        itemId: 'meal',
        operation: 'set',
        value: 1,
        mutationId: 'late-mutation',
      }),
    ).rejects.toThrow(/not collecting/);
  });
});
