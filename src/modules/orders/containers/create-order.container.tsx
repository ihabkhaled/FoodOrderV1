import { Minus, Plus, ShoppingCart } from '@/packages/icons';
import { formatMoney } from '@/shared/helpers';
import { BackLink, Loading } from '@/shared/ui';

import { useCreateOrder } from '../hooks/use-create-order.hook';
import { BUCKETS_REDIRECT_PATH } from '../routes/orders-route-paths.constants';

export function CreateOrderContainer() {
  const vm = useCreateOrder();

  if (vm.loading) return <Loading label={vm.t('loading')} />;
  const bucket = vm.bucket;
  if (!bucket) {
    return (
      <div className="page">
        <p className="form-error">{vm.error || 'Bucket was not found.'}</p>
      </div>
    );
  }

  return (
    <div className="page narrow">
      <BackLink fallback={BUCKETS_REDIRECT_PATH} label={vm.t('back')} />
      <div className="page-heading">
        <div>
          <p className="eyebrow">{vm.t('orderNow')}</p>
          <h1>{bucket.title}</h1>
          <p>{bucket.description}</p>
        </div>
        <div className="total-block">
          <span>{vm.t('total')}</span>
          <strong>{formatMoney(vm.total, bucket.currency, vm.locale)}</strong>
        </div>
      </div>
      <form className="stack-lg">
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

        <section className="section-card totals">
          <div>
            <span>{vm.gt('itemSubtotal')}</span>
            <strong>
              {formatMoney(vm.subtotal, bucket.currency, vm.locale)}
            </strong>
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

        <section className="section-card">
          <label>
            {vm.t('notes')}
            <textarea
              rows={4}
              maxLength={500}
              value={vm.notes}
              onChange={(event) => {
                vm.setNotes(event.target.value);
              }}
              placeholder={vm.t('orderNotesPlaceholder')}
            />
          </label>
        </section>
        {vm.error ? <p className="form-error">{vm.error}</p> : null}
        <div className="sticky-actions">
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
        </div>
      </form>
    </div>
  );
}
