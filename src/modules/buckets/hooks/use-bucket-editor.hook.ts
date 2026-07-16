import type { SyntheticEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import type {
  BucketDraft,
  BucketItem,
  BucketPricingPolicy,
  BucketVisibility,
  CurrencyCode,
  Locale,
} from '@/modules/data-access';
import {
  dataService,
  DEFAULT_PRICING_POLICY,
  MAX_BUCKET_ITEMS,
} from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { useNavigate, useParams } from '@/packages/router';
import { createId } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

import { BUCKETS_PATH } from '../routes/buckets-route-paths.constants';

const emptyItem = (sortOrder: number): BucketItem => ({
  id: createId('item'),
  name: '',
  description: '',
  category: '',
  unitPrice: 0,
  active: true,
  sortOrder,
});

const defaultPricingPolicy = (): BucketPricingPolicy => ({
  ...DEFAULT_PRICING_POLICY,
});

export interface BucketEditorViewModel {
  t: (key: MessageKey) => string;
  locale: Locale;
  isEditing: boolean;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  currency: CurrencyCode;
  setCurrency: (value: CurrencyCode) => void;
  visibility: BucketVisibility;
  pricingPolicy: BucketPricingPolicy;
  setPricingPolicy: (policy: BucketPricingPolicy) => void;
  items: BucketItem[];
  updateItem: <K extends keyof BucketItem>(
    id: string,
    key: K,
    value: BucketItem[K],
  ) => void;
  addItem: () => void;
  removeItem: (id: string) => void;
  loading: boolean;
  busy: boolean;
  error: string;
  valid: boolean;
  submit: (event: SyntheticEvent) => Promise<void>;
}

export function useBucketEditor(): BucketEditorViewModel {
  const { bucketId } = useParams();
  const isEditing = Boolean(bucketId);
  const navigate = useNavigate();
  const {
    user,
    currency: defaultCurrency,
    locale,
    t,
    showToast,
  } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [visibility, setVisibility] = useState<BucketVisibility>('private');
  const [pricingPolicy, setPricingPolicy] =
    useState<BucketPricingPolicy>(defaultPricingPolicy);
  const [items, setItems] = useState<BucketItem[]>([emptyItem(0)]);
  const [loading, setLoading] = useState(isEditing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditing) setCurrency(defaultCurrency);
  }, [defaultCurrency, isEditing]);

  useEffect(() => {
    if (!user || !bucketId) return;
    void dataService
      .getBucket(user, bucketId)
      .then((bucket) => {
        if (!bucket) throw new Error('Bucket was not found.');
        setTitle(bucket.title);
        setDescription(bucket.description);
        setCurrency(bucket.currency);
        setVisibility(bucket.visibility);
        setPricingPolicy({
          ...(bucket.pricingPolicy ?? DEFAULT_PRICING_POLICY),
        });
        setItems(bucket.items);
      })
      .catch((error_: unknown) => {
        setError(
          error_ instanceof Error ? error_.message : 'Unable to load bucket.',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [bucketId, user]);

  const valid = useMemo(
    () =>
      title.trim().length > 0 &&
      items.length > 0 &&
      items.every((item) => item.name.trim() && item.unitPrice >= 0),
    [title, items],
  );

  const updateItem = <K extends keyof BucketItem>(
    id: string,
    key: K,
    value: BucketItem[K],
  ): void => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    );
  };

  const addItem = (): void => {
    if (items.length >= MAX_BUCKET_ITEMS) {
      showToast(t('maxItemsReached'), 'error');
      return;
    }
    setItems((current) => [...current, emptyItem(current.length)]);
  };

  const removeItem = (id: string): void => {
    setItems((current) =>
      current.length === 1
        ? current
        : current
            .filter((item) => item.id !== id)
            .map((item, index) => ({ ...item, sortOrder: index })),
    );
  };

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    if (!user || !valid) {
      setError(t('completeEveryItem'));
      return;
    }
    const draft: BucketDraft = {
      title,
      description,
      currency,
      pricingPolicy,
      items,
    };
    try {
      setBusy(true);
      setError('');
      await (bucketId
        ? dataService.updateBucket(user, bucketId, draft)
        : dataService.createBucket(user, draft));
      showToast(t('bucketSaved'), 'success');
      await navigate(BUCKETS_PATH);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('tryAgain'));
    } finally {
      setBusy(false);
    }
  };

  return {
    t,
    locale,
    isEditing,
    title,
    setTitle,
    description,
    setDescription,
    currency,
    setCurrency,
    visibility,
    pricingPolicy,
    setPricingPolicy,
    items,
    updateItem,
    addItem,
    removeItem,
    loading,
    busy,
    error,
    valid,
    submit,
  };
}
