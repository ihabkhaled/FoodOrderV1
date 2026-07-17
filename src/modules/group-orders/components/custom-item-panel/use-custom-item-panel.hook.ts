import { useState } from 'react';

export interface CustomItemDraft {
  name: string;
  description: string;
  category: string;
  unitPrice: string;
}

const EMPTY_DRAFT: CustomItemDraft = {
  name: '',
  description: '',
  category: '',
  unitPrice: '0',
};

export interface CustomItemPanelViewModel {
  draft: CustomItemDraft;
  updateDraft: (patch: Partial<CustomItemDraft>) => void;
  validDraft: boolean;
  submit: () => void;
  approvalPrices: Record<string, string>;
  setApprovalPrice: (itemId: string, value: string) => void;
}

export function useCustomItemPanel(
  onAdd: (input: {
    name: string;
    description: string;
    category: string;
    unitPrice: number;
  }) => void,
): CustomItemPanelViewModel {
  const [draft, setDraft] = useState<CustomItemDraft>(EMPTY_DRAFT);
  const [approvalPrices, setApprovalPrices] = useState<Record<string, string>>(
    {},
  );
  const parsedPrice = Number(draft.unitPrice);
  const validDraft =
    draft.name.trim().length > 0 &&
    Number.isFinite(parsedPrice) &&
    parsedPrice >= 0;

  const updateDraft = (patch: Partial<CustomItemDraft>): void => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const submit = (): void => {
    if (!validDraft) return;
    onAdd({
      name: draft.name,
      description: draft.description,
      category: draft.category,
      unitPrice: parsedPrice,
    });
    setDraft(EMPTY_DRAFT);
  };

  const setApprovalPrice = (itemId: string, value: string): void => {
    setApprovalPrices((current) => ({ ...current, [itemId]: value }));
  };

  return {
    draft,
    updateDraft,
    validDraft,
    submit,
    approvalPrices,
    setApprovalPrice,
  };
}
