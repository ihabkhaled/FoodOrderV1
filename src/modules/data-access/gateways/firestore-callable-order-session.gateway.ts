import { getFunctions, httpsCallable } from '@/packages/firebase';

import type {
  CreateOrderSessionInput,
  OrderSessionService,
  TransitionOrderSessionInput,
  UpdateSessionContributionInput,
  UpdateSessionParticipantResponseInput,
} from '../contracts/order-session-service.interfaces';
import type { SessionUser } from '../types/domain.types';
import type {
  OrderSession,
  OrderSessionView,
  SessionContributionMutationRecord,
  SessionParticipant,
} from '../types/order-session.types';
import { getFirebaseRuntime } from './firebase-runtime.gateway';

const REGION = 'europe-west1';

const callable = <Request, Response>(name: string) =>
  httpsCallable<Request, Response>(
    getFunctions(getFirebaseRuntime().app, REGION),
    name,
  );

export class FirestoreCallableOrderSessionService
  implements OrderSessionService
{
  async listSessions(_user: SessionUser): Promise<OrderSession[]> {
    const result = await callable<Record<string, never>, OrderSession[]>(
      'listOrderSessionsV170',
    )({});
    return result.data;
  }

  async createSession(
    _user: SessionUser,
    input: CreateOrderSessionInput,
  ): Promise<OrderSession> {
    const result = await callable<CreateOrderSessionInput, OrderSession>(
      'createOrderSessionV170',
    )(input);
    return result.data;
  }

  async getSessionView(
    _user: SessionUser,
    sessionId: string,
  ): Promise<OrderSessionView | null> {
    const result = await callable<
      { sessionId: string },
      OrderSessionView | null
    >('getOrderSessionViewV170')({ sessionId });
    return result.data;
  }

  async transitionSession(
    _user: SessionUser,
    input: TransitionOrderSessionInput,
  ): Promise<OrderSession> {
    const result = await callable<TransitionOrderSessionInput, OrderSession>(
      'transitionOrderSessionV170',
    )(input);
    return result.data;
  }

  async updateParticipantResponse(
    _user: SessionUser,
    input: UpdateSessionParticipantResponseInput,
  ): Promise<SessionParticipant> {
    const result = await callable<
      UpdateSessionParticipantResponseInput,
      SessionParticipant
    >('updateSessionParticipantResponseV170')(input);
    return result.data;
  }

  async updateContribution(
    _user: SessionUser,
    input: UpdateSessionContributionInput,
  ): Promise<SessionContributionMutationRecord> {
    const result = await callable<
      UpdateSessionContributionInput,
      SessionContributionMutationRecord
    >('updateSessionContributionV170')(input);
    return result.data;
  }
}
