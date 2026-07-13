import { ReceiptText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { translateGroupOrder } from '@/i18n/groupOrderMessages';
import type { MessageKey } from '@/i18n/messages';
import { DEFAULT_PRICING_POLICY } from '@/lib/bucket';
import type {
  BucketPricingPolicy,
  Locale,
} from '@/types/domain';

interface PricingForm {
  vatPercent: string;
  servicePercent: string;
  deliveryAmount: string;
  vatAllocation: BucketPricingPolicy['vatAllocation'];
  serviceAllocation: BucketPricingPolicy['serviceAllocation'];
  deliveryAllocation: BucketPricingPolicy['deliveryAllocation'];
}

interface BucketPricingPanelProps {
  locale: Locale;
  policy?: BucketPricingPolicy;
  disabled: boolean;
  saving: boolean;
  translate: (key: MessageKey) => string;
  onSave: (policy: BucketPricingPolicy) => void;
}

const toForm = (policy: BucketPricingPolicy): PricingForm => ({
  vatPercent: String(policy.vatBasisPoints / 100),
  servicePercent: String(policy.serviceBasisPoints / 100),
  deliveryAmount: String(policy.deliveryMinor / 100),
  vatAllocation: policy.vatAllocation,
  serviceAllocation: policy.serviceAllocation,
  deliveryAllocation: policy.deliveryAllocation,
});

const toPolicy = (form: PricingForm): BucketPricingPolicy | null => {
  const vatPercent = Number(form.vatPercent);
  const servicePercent = Number(form.servicePercent);
  const deliveryAmount = Number(form.deliveryAmount);

  if (
    !Number.isFinite(vatPercent) ||
    !Number.isFinite(servicePercent) ||
    !Number.isFinite(deliveryAmount) ||
    vatPercent < 0 ||
    servicePercent < 0 ||
    deliveryAmount < 0
  ) {
    return null;
  }

  return {
    vatBasisPoints: Math.round(vatPercent * 100),
    serviceBasisPoints: Math.round(servicePercent * 100),
    deliveryMinor: Math.round(deliveryAmount * 100),
    vatAllocation: form.vatAllocation,
    serviceAllocation: form.serviceAllocation,
    deliveryAllocation: form.deliveryAllocation,
  };
};

export function BucketPricingPanel({
  locale,
  policy,
  disabled,
  saving,
  translate,
  onSave,
}: BucketPricingPanelProps) {
  const normalizedPolicy = policy ?? DEFAULT_PRICING_POLICY;
  const [form, setForm] = useState<PricingForm>(() => toForm(normalizedPolicy));
  const parsedPolicy = useMemo(() => toPolicy(form), [form]);
  const groupTranslate = (key: Parameters<typeof translateGroupOrder>[1]) =>
    translateGroupOrder(locale, key);

  useEffect(() => {
    setForm(toForm(normalizedPolicy));
  }, [normalizedPolicy]);

  const updateAllocation = (
    field: 'vatAllocation' | 'serviceAllocation' | 'deliveryAllocation',
    value: BucketPricingPolicy['vatAllocation'],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="section-card stack-md">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{groupTranslate('pricing')}</p>
          <h2>
            <ReceiptText size={18} aria-hidden="true" />
            {groupTranslate('pricing')}
          </h2>
        </div>
      </div>
      <div className="pricing-grid">
        <label>
          {groupTranslate('vatPercent')}
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.vatPercent}
            disabled={disabled}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                vatPercent: event.target.value,
              }));
            }}
          />
        </label>
        <label>
          {groupTranslate('servicePercent')}
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.servicePercent}
            disabled={disabled}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                servicePercent: event.target.value,
              }));
            }}
          />
        </label>
        <label>
          {groupTranslate('deliveryAmount')}
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.deliveryAmount}
            disabled={disabled}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                deliveryAmount: event.target.value,
              }));
            }}
          />
        </label>
      </div>
      <div className="pricing-grid">
        {(['vatAllocation', 'serviceAllocation', 'deliveryAllocation'] as const).map(
          (field) => (
            <label key={field}>
              {groupTranslate('allocation')}
              <select
                value={form[field]}
                disabled={disabled}
                onChange={(event) => {
                  updateAllocation(
                    field,
                    event.target.value as BucketPricingPolicy['vatAllocation'],
                  );
                }}
              >
                <option value="proportional">
                  {groupTranslate('splitProportional')}
                </option>
                <option value="equal">{groupTranslate('splitEqual')}</option>
              </select>
            </label>
          ),
        )}
      </div>
      <button
        className="button"
        disabled={disabled || saving || !parsedPolicy}
        onClick={() => {
          if (parsedPolicy) onSave(parsedPolicy);
        }}
      >
        {saving ? translate('loading') : groupTranslate('savePricing')}
      </button>
    </section>
  );
}
