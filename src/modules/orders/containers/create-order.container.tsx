import { useState } from 'react';

import { Minus, Plus, ShoppingCart } from '@/packages/icons';
import { formatMoney } from '@/shared/helpers';
import { BackLink, FeatureTour, Loading } from '@/shared/ui';

import { useCreateOrder } from '../hooks/use-create-order.hook';
import { useCreateOrderTour } from '../hooks/use-create-order-tour.hook';
import { BUCKETS_REDIRECT_PATH } from '../routes/orders-route-paths.constants';

type OrderStep = 1 | 2 | 3;

export function CreateOrderContainer() {
  const vm = useCreateOrder();
  const { steps: tourSteps } = useCreateOrderTour();
  const [step, setStep] = useState<OrderStep>(1);

  if (vm.loading) return <Loading label={vm.t('loading')} />;
  const bucket = vm.bucket;
  if (!bucket) {
    return (
      <div className="page">
        <p className="form-error">{vm.error || 'Bucket was not found.'}</p>
      </div>
    );
  }

  const moveTo = (nextStep: OrderStep): void => {
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page narrow order-create-flow">
      <BackLink fallback={BUCKETS_REDIRECT_PATH} label={vm.t('back')} />
      <div className="page-heading order-create-heading">
        <div>
          <p className="eyebrow">{vm.t('orderNow')}</p>
          <h1>{bucket.title}</h1>
          <p className="muted">{bucket.description}</p>
        </div>
        <div className="total-block">
          <span>{vm.t('total')}</span>
          <strong>{formatMoney(vm.total, bucket.currency, vm.locale)}</strong>
        </div>
      </div>

      <ol className="order-stepper" aria-label={vm.t('orderNow')}>
        {[
          { number: 1 as const, label: vm.t('items') },
          { number: 2 as const, label: vm.t('notes') },
          { number: 3 as const, label: vm.t('total') },
        ].map((entry) => (
          <li
            key={entry.number}
            className={`order-step ${step === entry.number ? 'order-step--active' : ''} ${step > entry.number ? 'order-step--done' : ''}`}
            aria-current={step === entry.number ? 'step' : undefined}
          >
            <span>{step > entry.number ? '✓' : entry.number}</span>
            <strong>{entry.label}</strong>
          </li>
        ))}
      </ol>

      <form className="stack-lg">
        {step === 1 ? (
          <section className="section-card order-picker order-step-panel">
            {bucket.items
              .filter((item) => item.active)
              .map((item) => (
                <article className="order-line" key={item.id}>
                  <div>
                    <h3>{item.name}</h3>
                    <span>
                      {item.category || vm.t('item')} ·{' '}
                      {formatMoney(item.unitPrice, bucket.currency, vm.locale)}
                    </span>
                  </div>
                  <div className="quantity-control">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => {
                        vm.adjust(item.id, -1);
                      }}
                      aria-label={`${vm.t('decrease')} ${item.name}`}
                    >
                      <Minus />
                    </button>
                    <output>{vm.quantities[item.id] ?? 0}</output>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => {
                        vm.adjust(item.id, 1);
                      }}
                      aria-label={`${vm.t('increase')} ${item.name}`}
                    >
                      <Plus />
                    </button>
                  </div>
                </article>
              ))}
          </section>
        ) : null}

        {step === 2 ? (
          <section className="section-card order-step-panel">
            <label>
              {vm.t('notes')}
              <textarea
                rows={5}
                maxLength={500}
                value={vm.notes}
                onChange={(event) => {
                  vm.setNotes(event.target.value);
                }}
                placeholder={vm.t('orderNotesPlaceholder')}
                autoFocus
              />
            </label>
          </section>
        ) : null}

        {step === 3 ? (
          <div className="stack-lg order-step-panel">
            <section className="section-card order-review-lines">
              {vm.selectedLines.map((line) => (
                <div className="detail-line" key={line.id}>
                  <div>
                    <strong>{line.name}</strong>
                    <span>
                      {line.quantity} ×{' '}
                      {formatMoney(line.unitPrice, bucket.currency, vm.locale)}
                    </span>
                  </div>
                  <strong>
                    {formatMoney(
                      line.unitPrice * line.quantity,
                      bucket.currency,
                      vm.locale,
                    )}
                  </strong>
                </div>
              ))}
            </section>

            <section className="section-card totals">
              <div>
                <span>{vm.gt('itemSubtotal')}</span>
                <strong>{formatMoney(vm.subtotal, bucket.currency, vm.locale)}</strong>
              </div>
              <div>
                <span>{vm.gt('vat')}</span>
                <strong>
                  {formatMoney(
                    (vm.receipt?.vatMinor ?? 0) / 100,
                    bucket.currency,
                    vm.locale,
                  )}
                </strong>
              </div>
              <div>
                <span>{vm.gt('service')}</span>
                <strong>
                  {formatMoney(
                    (vm.receipt?.serviceMinor ?? 0) / 100,
                    bucket.currency,
                    vm.locale,
                  )}
                </strong>
              </div>
              <div>
                <span>{vm.gt('delivery')}</span>
                <strong>
                  {formatMoney(
                    (vm.receipt?.deliveryMinor ?? 0) / 100,
                    bucket.currency,
                    vm.locale,
                  )}
                </strong>
              </div>
              <div className="grand-total">
                <span>{vm.gt('finalTotal')}</span>
                <strong>{formatMoney(vm.total, bucket.currency, vm.locale)}</strong>
              </div>
            </section>
          </div>
        ) : null}

        {vm.error ? <p className="form-error">{vm.error}</p> : null}
        <div className="sticky-actions order-flow-actions">
          {step > 1 ? (
            <button
              type="button"
              className="button secondary"
              disabled={vm.busy}
              onClick={() => moveTo((step - 1) as OrderStep)}
            >
              {vm.t('back')}
            </button>
          ) : null}
          {step < 3 ? (
            <button
              type="button"
              className="button"
              disabled={vm.busy || vm.selectedLines.length === 0}
              onClick={() => moveTo((step + 1) as OrderStep)}
            >
              {vm.t('tourNext')}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="button secondary"
                disabled={vm.busy || vm.selectedLines.length === 0}
                onClick={() => void vm.submit('draft')}
              >
                {vm.t('saveDraft')}
              </button>
              <button
                type="button"
                className="button"
                disabled={vm.busy || vm.selectedLines.length === 0}
                onClick={() => void vm.submit('placed')}
              >
                <ShoppingCart />
                {vm.busy ? vm.t('loading') : vm.t('placeOrder')}
              </button>
            </>
          )}
        </div>
      </form>
      <FeatureTour
        page="create-order"
        steps={tourSteps}
        nextLabel={vm.t('tourNext')}
        doneLabel={vm.t('tourDone')}
        skipLabel={vm.t('tourSkip')}
        closeLabel={vm.t('close')}
        skipAllLabel={vm.t('tourSkipAll')}
      />
    </div>
  );
}
