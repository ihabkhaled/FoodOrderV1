import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_PRICING_POLICY,
  LocalDataService,
  LocalOrderSessionService,
  LocalSharingService,
  ORDER_SESSION_STATUS,
  PARTICIPANT_RESPONSE,
  type Bucket,
  type BucketDraft,
  type SessionUser,
} from '@/modules/data-access';

const OWNER: SessionUser = {
  id: 'owner-1',
  email: 'owner@example.com',
  displayName: 'Owner',
  isDemo: true,
};
const CONTRIBUTOR: SessionUser = {
  id: 'contributor-1',
  email: 'contributor@example.com',
  displayName: 'Contributor',
  isDemo: true,
};
const VIEWER: SessionUser = {
  id: 'viewer-1',
  email: 'viewer@example.com',
  displayName: 'Viewer',
  isDemo: true,
};

const bucketDraft = (unitPrice = 100): BucketDraft => ({
  title: 'Office breakfast',
  description: 'Reusable menu',
  currency: 'EGP',
  pricingPolicy: {
    ...DEFAULT_PRICING_POLICY,
    vatBasisPoints: 1_400,
    serviceBasisPoints: 1_200,
    deliveryMinor: 2_000,
  },
  customItemMode: 'proposal',
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

const createSharedBucket = async (
  member: SessionUser = CONTRIBUTOR,
  role: 'contributor' | 'viewer' = 'contributor',
): Promise<Bucket> => {
  const dataService = new LocalDataService();
  const sharingService = new LocalSharingService();
  const saved = await dataService.createBucket(OWNER, bucketDraft());
  const bucket = await sharingService.enableSharing(OWNER, saved.id);
  const invitation = await sharingService.createInvite(OWNER, bucket.id, role);
  await sharingService.acceptJoinCode(member, invitation.joinCode);
  return bucket;
};

beforeEach(() => {
  localStorage.clear();
});

describe('LocalOrderSessionService', () => {
  it('creates an independent collecting session with privacy-minimal participants', async () => {
    const bucket = await createSharedBucket();
    const service = new LocalOrderSessionService();
    const session = await service.createSession(OWNER, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
      deadlineAt: '2099-07-18T10:00:00.000Z',
      autoLock: true,
    });
    const view = await service.getSessionView(OWNER, session.id);

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
      OWNER.id,
      CONTRIBUTOR.id,
    ]);
    expect(view?.participants[0]).not.toHaveProperty('email');
    expect(view?.session.menuItems.map((item) => item.unitPriceMinor)).toEqual([
      10_000,
      2_500,
    ]);
  });

  it('keeps the live menu snapshot unchanged after the template is edited', async () => {
    const bucket = await createSharedBucket();
    const dataService = new LocalDataService();
    const service = new LocalOrderSessionService();
    const session = await service.createSession(OWNER, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
    });
    await dataService.updateBucket(OWNER, bucket.id, bucketDraft(250));

    const view = await service.getSessionView(OWNER, session.id);
    expect(view?.session.menuItems[0]?.unitPriceMinor).toBe(10_000);
    expect(view?.session.sourceMenuRevision).toBe(bucket.revision);
  });

  it('suppresses duplicate recurring occurrences', async () => {
    const bucket = await createSharedBucket();
    const service = new LocalOrderSessionService();
    const input = {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
      scheduleOccurrenceKey: 'weekday-breakfast:2026-07-19',
    };

    await service.createSession(OWNER, input);
    await expect(service.createSession(OWNER, input)).rejects.toThrow(
      /already exists/,
    );
  });

  it('lists sessions only for active participants and returns viewer-safe views', async () => {
    const bucket = await createSharedBucket(VIEWER, 'viewer');
    const service = new LocalOrderSessionService();
    const session = await service.createSession(OWNER, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
    });

    expect((await service.listSessions(OWNER)).map((item) => item.id)).toEqual([
      session.id,
    ]);
    expect((await service.listSessions(VIEWER)).map((item) => item.id)).toEqual([
      session.id,
    ]);
    expect((await service.getSessionView(VIEWER, session.id))?.session.id).toBe(
      session.id,
    );
    expect(await service.listSessions(CONTRIBUTOR)).toEqual([]);
    expect(await service.getSessionView(CONTRIBUTOR, session.id)).toBeNull();
  });

  it('updates participant status with session and participant revisions', async () => {
    const bucket = await createSharedBucket();
    const service = new LocalOrderSessionService();
    const session = await service.createSession(OWNER, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
    });
    const initialView = await service.getSessionView(CONTRIBUTOR, session.id);
    const participant = initialView?.currentParticipant;
    expect(participant).not.toBeNull();

    const done = await service.updateParticipantResponse(CONTRIBUTOR, {
      sessionId: session.id,
      expectedSessionRevision: session.revision,
      expectedParticipantRevision: participant?.revision ?? 0,
      response: PARTICIPANT_RESPONSE.done,
    });
    const updatedView = await service.getSessionView(OWNER, session.id);

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
      service.updateParticipantResponse(CONTRIBUTOR, {
        sessionId: session.id,
        expectedSessionRevision: session.revision,
        expectedParticipantRevision: done.revision,
        response: PARTICIPANT_RESPONSE.skipped,
      }),
    ).rejects.toThrow(/changed/);
  });

  it('persists contribution aggregate and authoritative minor-unit totals', async () => {
    const bucket = await createSharedBucket();
    const service = new LocalOrderSessionService();
    const session = await service.createSession(OWNER, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
    });
    const record = await service.updateContribution(CONTRIBUTOR, {
      sessionId: session.id,
      expectedSessionRevision: session.revision,
      itemId: 'meal',
      operation: 'set',
      value: 2,
      mutationId: 'mutation-1',
    });
    const view = await service.getSessionView(OWNER, session.id);

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
    expect(
      view?.participants.find(
        (participant) => participant.userId === CONTRIBUTOR.id,
      ),
    ).toMatchObject({ response: PARTICIPANT_RESPONSE.ordering });
  });

  it('denies stale, viewer, unavailable-item, and non-organizer mutations', async () => {
    const bucket = await createSharedBucket(VIEWER, 'viewer');
    const service = new LocalOrderSessionService();
    const session = await service.createSession(OWNER, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
    });

    await expect(
      service.updateContribution(VIEWER, {
        sessionId: session.id,
        expectedSessionRevision: session.revision,
        itemId: 'meal',
        operation: 'set',
        value: 1,
        mutationId: 'viewer-mutation',
      }),
    ).rejects.toThrow(/permission/);
    await expect(
      service.updateContribution(OWNER, {
        sessionId: session.id,
        expectedSessionRevision: session.revision,
        itemId: 'missing',
        operation: 'set',
        value: 1,
        mutationId: 'missing-item',
      }),
    ).rejects.toThrow(/not available/);
    await expect(
      service.transitionSession(VIEWER, {
        sessionId: session.id,
        expectedRevision: session.revision,
        nextStatus: ORDER_SESSION_STATUS.locked,
      }),
    ).rejects.toThrow(/organizer/);
    await expect(
      service.transitionSession(OWNER, {
        sessionId: session.id,
        expectedRevision: 1,
        nextStatus: ORDER_SESSION_STATUS.locked,
      }),
    ).rejects.toThrow(/changed/);
  });

  it('locks an order and blocks later contributions', async () => {
    const bucket = await createSharedBucket();
    const service = new LocalOrderSessionService();
    const session = await service.createSession(OWNER, {
      menuTemplateId: bucket.id,
      timezone: 'Africa/Cairo',
    });
    const locked = await service.transitionSession(OWNER, {
      sessionId: session.id,
      expectedRevision: session.revision,
      nextStatus: ORDER_SESSION_STATUS.locked,
    });

    expect(locked.status).toBe(ORDER_SESSION_STATUS.locked);
    await expect(
      service.updateContribution(CONTRIBUTOR, {
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
