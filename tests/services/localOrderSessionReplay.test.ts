import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_PRICING_POLICY,
  LocalDataService,
  LocalOrderSessionService,
  type SessionUser,
} from '@/modules/data-access';

const owner: SessionUser = {
  id: 'owner-replay',
  email: 'owner-replay@example.com',
  displayName: 'Owner Replay',
  isDemo: true,
};

beforeEach(() => {
  localStorage.clear();
});

describe('LocalOrderSessionService idempotent replay', () => {
  it('returns an already-applied record before stale revision rejection', async () => {
    const dataService = new LocalDataService();
    const sessionService = new LocalOrderSessionService();
    const menu = await dataService.saveBucket(owner, {
      title: 'Replay menu',
      description: '',
      currency: 'EGP',
      pricingPolicy: DEFAULT_PRICING_POLICY,
      customItemMode: 'proposal',
      items: [
        {
          id: 'meal',
          name: 'Meal',
          description: '',
          category: '',
          unitPrice: 100,
          active: true,
        },
      ],
    });
    const session = await sessionService.createSession(owner, {
      menuTemplateId: menu.id,
      timezone: 'Africa/Cairo',
    });
    const input = {
      sessionId: session.id,
      expectedSessionRevision: session.revision,
      itemId: 'meal',
      operation: 'set' as const,
      value: 2,
      mutationId: 'stable-replay-mutation',
    };

    const first = await sessionService.updateContribution(owner, input);
    const replayed = await sessionService.updateContribution(owner, input);
    const view = await sessionService.getSessionView(owner, session.id);

    expect(replayed).toEqual(first);
    expect(view?.session.aggregate).toEqual({ meal: 2 });
    expect(view?.contributions).toHaveLength(1);
    expect(view?.contributions[0]?.revision).toBe(1);
  });
});
