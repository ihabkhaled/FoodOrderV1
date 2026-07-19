import type { CurrencyCode } from './domain.types';
import type { SessionContributionMutationRecord } from './order-session.types';

export interface SessionInvite {
  id: string;
  sessionId: string;
  status: 'pending' | 'revoked' | 'exhausted' | 'expired';
  createdBy: string;
  expiresAt: string;
  expiresAtMillis: number;
  maxUses: number;
  usedCount: number;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreateSessionInviteResult {
  invite: SessionInvite;
  shareCode: string;
}

export interface PublicSessionInvitePreview {
  sessionId: string;
  title: string;
  organizerDisplayName: string;
  deadlineAt: string | null;
  currency: CurrencyCode;
  activeItemCount: number;
  participantCount: number;
  isCollecting: boolean;
}

export interface GuestSessionCapability {
  sessionId: string;
  guestId: string;
  guestSecret: string;
  expiresAt: string;
  displayName: string;
}

export interface StoredGuestSessionCapability {
  sessionId: string;
  guestId: string;
  expiresAt: string;
  displayName: string;
  secretHash: string;
  status: 'active' | 'revoked' | 'linked' | 'expired';
  linkedUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuestSessionView {
  preview: PublicSessionInvitePreview;
  participantResponse:
    | 'pending'
    | 'viewed'
    | 'ordering'
    | 'done'
    | 'skipped'
    | 'removed';
  participantRevision: number;
  sessionRevision: number;
  quantities: Readonly<Record<string, number>>;
  menuItems: {
    id: string;
    name: string;
    description: string;
    category: string;
    unitPriceMinor: number;
    active: boolean;
    sortOrder: number;
  }[];
  personalSubtotalMinor: number;
  personalFinalTotalMinor: number | null;
  paymentStatus: string | null;
}

export interface GuestContributionInput {
  sessionId: string;
  guestId: string;
  guestSecret: string;
  expectedSessionRevision: number;
  itemId: string;
  operation: 'set' | 'increment';
  value: number;
  mutationId: string;
}

export interface GuestResponseInput {
  sessionId: string;
  guestId: string;
  guestSecret: string;
  expectedSessionRevision: number;
  expectedParticipantRevision: number;
  response: 'done' | 'skipped';
}

export interface GuestAccountLinkResult {
  sessionId: string;
  guestId: string;
  userId: string;
  linkedAt: string;
  transferredMutationCount: number;
}

export interface GuestContributionResult {
  mutation: SessionContributionMutationRecord;
  sessionRevision: number;
}
