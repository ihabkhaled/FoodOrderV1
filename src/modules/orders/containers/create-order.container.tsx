import { Minus, Plus, ShoppingCart } from '@/packages/icons';
import { formatMoney } from '@/shared/helpers';
import { BackLink, FeatureTour, Loading } from '@/shared/ui';

import type {
  CreateOrderViewModel,
  OrderStep,
} from '../hooks/use-create-order.hook';
import { useCreateOrder } from '../hooks/use-create-order.hook';
import { useCreateOrderTour } from '../hooks/use-create-order-tour.hook';
import { BUCKETS_REDIRECT_PATH } from '../routes/orders-route-paths.constants';

function OrderFlowActions({ vm }: { vm: CreateOrderViewModel }) {
  const selectionDisabled = vm.busy || vm.selectedLines.length === 0;
  return (
    <div className="sticky-actions order-flow-actions">
      {vm.step > 1 ? (
        <button
          type="button"
          className="button secondary"
          disabled={vm.busy}
          onClick={() => {
            vm.moveTo((vm.step - 1) as OrderStep);
          }}
        >
          {vm.t('back')}
        </button>
      ) : null}
      {vm.step < 3 ? (
        <button
          type="button"
          className="button"
          disabled={selectionDisabled}
          onClick={() => {
            vm.moveTo((vm.step + 1) as OrderStep);
          }}
        >
          {vm.t('tourNext')}
        </button>
      ) : (
        <>
          {vm.canOpenForFriends ? (
            <button
              type="button"
              className="button secondary"
              disabled={selectionDisabled}
              onClick={() => void vm.openForFriends()}
            >
              {vm.busy ? vm.t('loading') : vm.openForFriendsLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="button"
            disabled={selectionDisabled}
            onClick={() => void vm.submit('placed')}
          >
            <ShoppingCart />
            {vm.busy ? vm.t('loading') : vm.t('placeOrder')}
          </button>
        </>
      )}
    </div>
  );
}

export function CreateOrderContainer() {
  const vm = useCreateOrder();
  const { steps: tourSteps } = useCreateOrderTour();

  if (vm.loading) return <Loading label={vm.t('loading')} />;
  const bucket = vm.bucket;
  if (!bucket) {
    return (
      <div className="page">
        <p className="form-error">{vm.error || 'Bucket was not found.'}</p>
      </div>
    );
  }

  const totals = (
    <section className="section-card totals">
      <div>
        <span>{vm.gt('itemSubtotal')}</span>
        <strong>{formatMoney(vm.subtotal, bucket.currency, vm.locale)}</strong>
      </div>
      <div>
        <span>{vm.gt('vat')}</span>
        <strong>
          {formatMoney((vm.receipt?.vatMinor ?? 0) / 100, bucket.currency, vm.locale)}
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
  );

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
            className={`order-step ${vm.step === entry.number ? 'order-step--active' : ''} ${vm.step > entry.number ? 'order-step--done' : ''}`}
            aria-current={vm.step === entry.number ? 'step' : undefined}
          >
            <span>{vm.step > entry.number ? '✓' : entry.number}</span>
            <strong>{entry.label}</strong>
          </li>
        ))}
      </ol>

      <form
        className="stack-lg"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        {vm.step === 1 ? (
          <div className="stack-lg order-step-panel">
            <section className="section-card order-picker">
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
            {vm.selectedLines.length > 0 ? totals : null}
          </div>
        ) : null}

        {vm.step === 2 ? (
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
              />
            </label>
          </section>
        ) : null}

        {vm.step === 3 ? (
          <div className="stack-lg order-step-panel">
            <section className="section-card order-review-lines">
              {vm.selectedLines.map((line) => (
                <div className="detail-line" key={line.id}>
                  <div>
                    <strong>{line.name}</strong>
                    <span>
                      {line.quantity} × {formatMoney(line.unitPrice, bucket.currency, vm.locale)}
                    </span>
                  </div>
                  <strong>
                    {formatMoney(line.unitPrice * line.quantity, bucket.currency, vm.locale)}
                  </strong>
                </div>
              ))}
            </section>
            {totals}
          </div>
        ) : null}

        {vm.error ? <p className="form-error">{vm.error}</p> : null}
        <OrderFlowActions vm={vm} />
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
