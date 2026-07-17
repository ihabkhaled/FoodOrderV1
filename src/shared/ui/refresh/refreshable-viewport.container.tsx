import type { ReactNode } from 'react';

import type { Locale } from '@/shared/types';

import { RefreshProvider } from './providers/refresh.provider';
import { RefreshableViewportView } from './refreshable-viewport.component';
import { useRefreshableViewport } from './use-refreshable-viewport.hook';

interface RefreshableViewportProps {
  readonly locale: Locale;
  readonly children: ReactNode;
}

function RefreshableViewportContent({ locale, children }: RefreshableViewportProps) {
  const viewport = useRefreshableViewport();
  return (
    <RefreshableViewportView locale={locale} {...viewport}>
      {children}
    </RefreshableViewportView>
  );
}

export function RefreshableViewport({ locale, children }: RefreshableViewportProps) {
  return (
    <RefreshProvider>
      <RefreshableViewportContent locale={locale}>{children}</RefreshableViewportContent>
    </RefreshProvider>
  );
}
