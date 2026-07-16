import type { CurrencyCode } from '@/modules/data-access';
import { MAX_BUCKET_ITEMS } from '@/modules/data-access';
import { BucketPricingPanel } from '@/modules/group-orders';
import { ArrowLeft, GripVertical, Plus, Save, Trash2 } from '@/packages/icons';
import { Link } from '@/packages/router';
import { SUPPORTED_CURRENCIES } from '@/platform/device';
import { Loading } from '@/shared/ui';

import { useBucketEditor } from '../hooks/use-bucket-editor.hook';
import { BUCKETS_PATH } from '../routes/buckets-route-paths.constants';

export function BucketEditorContainer() {
  const vm = useBucketEditor();

  if (vm.loading) return <Loading label={vm.t('loading')} />;

  return (
    <div className="page narrow">
      <div className="page-heading">
        <div>
          <Link className="back-link" to={BUCKETS_PATH}>
            <ArrowLeft />
            {vm.t('back')}
          </Link>
          <h1>{vm.isEditing ? vm.t('editBucket') : vm.t('createBucket')}</h1>
          {vm.visibility === 'shared' ? (
            <p className="muted">{vm.t('sharedBucketEditHint')}</p>
          ) : null}
        </div>
      </div>
      <form className="stack-lg" onSubmit={(event) => void vm.submit(event)}>
        <section className="section-card form-grid">
          <label>
            {vm.t('bucketTitle')}
            <input
              value={vm.title}
              onChange={(event) => {
                vm.setTitle(event.target.value);
              }}
              maxLength={60}
              required
            />
          </label>
          <label>
            {vm.t('description')}
            <textarea
              value={vm.description}
              onChange={(event) => {
                vm.setDescription(event.target.value);
              }}
              maxLength={240}
              rows={3}
            />
          </label>
          <label>
            {vm.t('currency')}
            <select
              value={vm.currency}
              onChange={(event) => {
                vm.setCurrency(event.target.value as CurrencyCode);
              }}
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </label>
        </section>

        <BucketPricingPanel
          locale={vm.locale}
          policy={vm.pricingPolicy}
          onChange={vm.setPricingPolicy}
        />

        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{vm.t('items')}</p>
              <h2>
                {vm.items.length} / {MAX_BUCKET_ITEMS}
              </h2>
            </div>
            <button
              type="button"
              className="button secondary"
              onClick={vm.addItem}
            >
              <Plus />
              {vm.t('addItem')}
            </button>
          </div>
          <div className="item-editor-list">
            {vm.items.map((item, index) => (
              <article className="item-editor" key={item.id}>
                <GripVertical className="drag-hint" aria-hidden="true" />
                <div className="item-fields">
                  <label>
                    {vm.t('itemName')}
                    <input
                      value={item.name}
                      onChange={(event) => {
                        vm.updateItem(item.id, 'name', event.target.value);
                      }}
                      maxLength={60}
                      required
                    />
                  </label>
                  <label>
                    {vm.t('category')}
                    <input
                      value={item.category}
                      onChange={(event) => {
                        vm.updateItem(item.id, 'category', event.target.value);
                      }}
                      maxLength={40}
                    />
                  </label>
                  <label>
                    {vm.t('unitPrice')}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) => {
                        vm.updateItem(
                          item.id,
                          'unitPrice',
                          Number(event.target.value),
                        );
                      }}
                    />
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(event) => {
                        vm.updateItem(item.id, 'active', event.target.checked);
                      }}
                    />
                    {vm.t('active')}
                  </label>
                </div>
                <button
                  type="button"
                  className="icon-button danger-ghost"
                  disabled={vm.items.length === 1}
                  onClick={() => {
                    vm.removeItem(item.id);
                  }}
                  aria-label={`${vm.t('delete')} ${index + 1}`}
                >
                  <Trash2 />
                </button>
              </article>
            ))}
          </div>
        </section>

        {vm.error ? (
          <p className="form-error" role="alert">
            {vm.error}
          </p>
        ) : null}
        <div className="sticky-actions">
          <Link className="button secondary" to={BUCKETS_PATH}>
            {vm.t('cancel')}
          </Link>
          <button className="button" disabled={vm.busy || !vm.valid}>
            <Save />
            {vm.busy ? vm.t('loading') : vm.t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
