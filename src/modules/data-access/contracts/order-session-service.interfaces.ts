import type {
  OrderSessionStatus,
  ParticipantResponse,
} from '../enums/order-session.enums';
import type { ContributionOperation, SessionUser } from '../types/domain.types';
import type {
  OrderSession,
  OrderSessionView,
  SessionContributionMutationRecord,
  SessionParticipant,
} from '../types/order-session.types';

export interface CreateOrderSessionInput {
  menuTemplateId: string;
  title?: string;
  timezone: string;
  deadlineAt?: string | null;
  autoLock?: boolean;
  workspaceId?: string | null;
  scheduleOccurrenceKey?: string | null;
}

export interface TransitionOrderSessionInput {
  sessionId: string;
  expectedRevision: number;
  nextStatus: OrderSessionStatus;
}

export interface UpdateSessionParticipantResponseInput {
  sessionId: string;
  expectedSessionRevision: number;
  expectedParticipantRevision: number;
  response: ParticipantResponse;
}

export interface UpdateSessionContributionInput {
  sessionId: string;
  expectedSessionRevision: number;
  itemId: string;
  operation: ContributionOperation;
  value: number;
  mutationId: string;
}

export interface OrderSessionService {
  listSessions(user: SessionUser): Promise<OrderSession[]>;
  createSession(
    user: SessionUser,
    input: CreateOrderSessionInput,
  ): Promise<OrderSession>;
  getSessionView(
    user: SessionUser,
    sessionId: string,
  ): Promise<OrderSessionView | null>;
  transitionSession(
    user: SessionUser,
    input: TransitionOrderSessionInput,
  ): Promise<OrderSession>;
  updateParticipantResponse(
    user: SessionUser,
    input: UpdateSessionParticipantResponseInput,
  ): Promise<SessionParticipant>;
  updateContribution(
    user: SessionUser,
    input: UpdateSessionContributionInput,
  ): Promise<SessionContributionMutationRecord>;
}
