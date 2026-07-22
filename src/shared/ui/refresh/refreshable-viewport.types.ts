import type { ReactNode, TouchEvent } from 'react';

import type { Locale } from '@/shared/types';

export interface RefreshableViewportViewProps {
  readonly locale: Locale;
  readonly available: boolean;
  readonly refreshing: boolean;
  readonly armed: boolean;
  readonly distance: number;
  readonly refresh: () => Promise<void>;
  readonly onTouchStart: (event: TouchEvent<HTMLDivElement>) => void;
  readonly onTouchMove: (event: TouchEvent<HTMLDivElement>) => void;
  readonly onTouchEnd: () => void;
  readonly children: ReactNode;
}
