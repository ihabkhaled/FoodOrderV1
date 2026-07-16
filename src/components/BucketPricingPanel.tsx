import { translateGroupOrder } from '@/i18n/groupOrderMessages';
import { ReceiptText } from '@/packages/icons';
import type { BucketPricingPolicy, Locale } from '@/types/domain';

interface BucketPricingPanelProps {
  locale: Locale;
  policy: BucketPricingPolicy;
  disabled?: boolean;
  onChange: (policy: BucketPricingPolicy) => void;
}

const toBasisPoints = (value: string): number => {
  const percentage = Number(value);
  if (!Number.isFinite(percentage)) return 0;
  return Math.round(Math.min(100, Math.max(0, percentage)) * 100);
};

const toMinorUnits = (value: string): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(Math.max(0, amount) * 100);
};

export function BucketPricingPanel({
  locale,
  policy,
  disabled = false,
  onChange,
}: BucketPricingPanelProps) {
  const groupTranslate = (key: Parameters<typeof translateGroupOrder>[1]) =>
    translateGroupOrder(locale, key);
  const updateAllocation = (
    field: 'vatAllocation' | 'serviceAllocation' | 'deliveryAllocation',
    value: BucketPricingPolicy['vatAllocation'],
  ) => {
    onChange({ ...policy, [field]: value });
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
            value={policy.vatBasisPoints / 100}
            disabled={disabled}
            onChange={(event) => {
              onChange({
                ...policy,
                vatBasisPoints: toBasisPoints(event.target.value),
              });
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
            value={policy.serviceBasisPoints / 100}
            disabled={disabled}
            onChange={(event) => {
              onChange({
                ...policy,
                serviceBasisPoints: toBasisPoints(event.target.value),
              });
            }}
          />
        </label>
        <label>
          {groupTranslate('deliveryAmount')}
          <input
            type="number"
            min="0"
            step="0.01"
            value={policy.deliveryMinor / 100}
            disabled={disabled}
            onChange={(event) => {
              onChange({
                ...policy,
                deliveryMinor: toMinorUnits(event.target.value),
              });
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
                value={policy[field]}
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
    </section>
  );
}
