import { useState } from 'react';

export type ReceiptView = 'summary' | 'person' | 'item';

export interface GroupReceiptSectionViewModel {
  view: ReceiptView;
  setView: (view: ReceiptView) => void;
}

export function useGroupReceiptSection(): GroupReceiptSectionViewModel {
  const [view, setView] = useState<ReceiptView>('summary');
  return { view, setView };
}
