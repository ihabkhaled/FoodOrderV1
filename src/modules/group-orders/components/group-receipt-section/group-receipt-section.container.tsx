import type {
  CurrencyCode,
  GroupOrderReceiptSnapshot,
  Locale,
} from '@/modules/data-access';

import { GroupReceiptSectionView } from './group-receipt-section.component';
import { useGroupReceiptSection } from './use-group-receipt-section.hook';

interface GroupReceiptSectionProps {
  receipt: GroupOrderReceiptSnapshot;
  currency: CurrencyCode;
  locale: Locale;
}

export function GroupReceiptSection({
  receipt,
  currency,
  locale,
}: GroupReceiptSectionProps) {
  const vm = useGroupReceiptSection();

  return (
    <GroupReceiptSectionView
      receipt={receipt}
      currency={currency}
      locale={locale}
      view={vm.view}
      onViewChange={vm.setView}
    />
  );
}
