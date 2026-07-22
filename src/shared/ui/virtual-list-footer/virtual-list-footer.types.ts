import type { Locale } from '@/shared/types';

export interface VirtualListFooterProps {
  readonly loading: boolean;
  readonly hasMore: boolean;
  readonly error: string;
  readonly locale: Locale;
  readonly onRetry: () => void;
}
