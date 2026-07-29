import type { BucketPricingPolicy, Locale } from '@/modules/data-access';
import { ReceiptText } from '@/packages/icons';
import { NumericField } from '@/shared/ui';

import type { GroupOrderMessageKey } from '../../i18n/group-order-messages.constants';
import { translateGroupOrder } from '../../i18n/translate-group-order.helper';

interface BucketPricingPanelProps {
  locale: Locale;
  policy: BucketPricingPolicy;
  disabled?: boolean;
  onChange: (policy: BucketPricingPolicy) => void;
}

export function BucketPricingPanel({
  locale,
  policy,
  disabled = false,
  onChange,
}: BucketPricingPanelProps) {
  const groupTranslate = (key: GroupOrderMessageKey) =>
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
        <NumericField
          id="bucket-pricing-vat"
          label={groupTranslate('vatPercent')}
          value={policy.vatBasisPoints / 100}
          max={100}
          disabled={disabled}
          onValueChange={(next) => {
            onChange({ ...policy, vatBasisPoints: Math.round(next * 100) });
          }}
        />
        <NumericField
          id="bucket-pricing-service"
          label={groupTranslate('servicePercent')}
          value={policy.serviceBasisPoints / 100}
          max={100}
          disabled={disabled}
          onValueChange={(next) => {
            onChange({ ...policy, serviceBasisPoints: Math.round(next * 100) });
          }}
        />
        <NumericField
          id="bucket-pricing-delivery"
          label={groupTranslate('deliveryAmount')}
          value={policy.deliveryMinor / 100}
          disabled={disabled}
          onValueChange={(next) => {
            onChange({ ...policy, deliveryMinor: Math.round(next * 100) });
          }}
        />
      </div>
      <div className="pricing-grid">
        {(
          ['vatAllocation', 'serviceAllocation', 'deliveryAllocation'] as const
        ).map((field) => (
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
        ))}
      </div>
    </section>
  );
}
