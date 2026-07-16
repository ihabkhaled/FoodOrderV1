import type { BucketItem, Locale } from '@/modules/data-access';

import { CustomItemPanelView } from './custom-item-panel.component';
import { useCustomItemPanel } from './use-custom-item-panel.hook';

interface CustomItemPanelProps {
  locale: Locale;
  canCreate: boolean;
  canSetPrice: boolean;
  canApprove: boolean;
  disabled: boolean;
  pendingItems: BucketItem[];
  onAdd: (input: {
    name: string;
    description: string;
    category: string;
    unitPrice: number;
  }) => void;
  onApprove: (itemId: string, unitPrice: number) => void;
}

export function CustomItemPanel({
  locale,
  canCreate,
  canSetPrice,
  canApprove,
  disabled,
  pendingItems,
  onAdd,
  onApprove,
}: CustomItemPanelProps) {
  const vm = useCustomItemPanel(onAdd);

  if (!canCreate && (!canApprove || pendingItems.length === 0)) return null;

  return (
    <CustomItemPanelView
      locale={locale}
      canCreate={canCreate}
      canSetPrice={canSetPrice}
      canApprove={canApprove}
      disabled={disabled}
      pendingItems={pendingItems}
      draft={vm.draft}
      validDraft={vm.validDraft}
      approvalPrices={vm.approvalPrices}
      onDraftChange={vm.updateDraft}
      onSubmit={vm.submit}
      onApprovalPriceChange={vm.setApprovalPrice}
      onApprove={onApprove}
    />
  );
}
