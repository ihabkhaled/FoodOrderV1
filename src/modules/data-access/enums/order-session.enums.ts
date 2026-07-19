export const ORDER_SESSION_STATUS = {
  draft: 'draft',
  collecting: 'collecting',
  locked: 'locked',
  submitted: 'submitted',
  confirmed: 'confirmed',
  delivered: 'delivered',
  settling: 'settling',
  settled: 'settled',
  cancelled: 'cancelled',
} as const;

export type OrderSessionStatus =
  (typeof ORDER_SESSION_STATUS)[keyof typeof ORDER_SESSION_STATUS];

export const PARTICIPANT_RESPONSE = {
  pending: 'pending',
  viewed: 'viewed',
  ordering: 'ordering',
  done: 'done',
  skipped: 'skipped',
  removed: 'removed',
} as const;

export type ParticipantResponse =
  (typeof PARTICIPANT_RESPONSE)[keyof typeof PARTICIPANT_RESPONSE];

export const PARTICIPANT_IDENTITY_KIND = {
  account: 'account',
  guest: 'guest',
} as const;

export type ParticipantIdentityKind =
  (typeof PARTICIPANT_IDENTITY_KIND)[keyof typeof PARTICIPANT_IDENTITY_KIND];

export const SESSION_PARTICIPANT_ROLE = {
  organizer: 'organizer',
  editor: 'editor',
  participant: 'participant',
  viewer: 'viewer',
} as const;

export type SessionParticipantRole =
  (typeof SESSION_PARTICIPANT_ROLE)[keyof typeof SESSION_PARTICIPANT_ROLE];

export const PAYMENT_STATUS = {
  unpaid: 'unpaid',
  declaredPaid: 'declared_paid',
  proofSubmitted: 'proof_submitted',
  verified: 'verified',
  rejected: 'rejected',
  waived: 'waived',
  refunded: 'refunded',
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const SETTLEMENT_ALLOCATION_STRATEGY = {
  equal: 'equal',
  proportional: 'proportional',
  manual: 'manual',
} as const;

export type SettlementAllocationStrategy =
  (typeof SETTLEMENT_ALLOCATION_STRATEGY)[keyof typeof SETTLEMENT_ALLOCATION_STRATEGY];
