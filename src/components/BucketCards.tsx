import {
  CopyPlus,
  Share2,
  ShoppingBasket,
  Trash2,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import type { MessageKey } from '@/i18n/messages';
import { formatDateTime } from '@/lib/date';
import type { Bucket, Locale } from '@/types/domain';

interface BucketCardProps {
  readonly bucket: Bucket;
  readonly locale: Locale;
  readonly t: (key: MessageKey) => string;
  readonly onDuplicate: (bucket: Bucket) => void;
  readonly onDelete: (bucket: Bucket) => void;
}

export function OwnedBucketCard({
  bucket,
  locale,
  t,
  onDuplicate,
  onDelete,
}: BucketCardProps) {
  return (
    <article className="bucket-card">
      <div className="bucket-card-top">
        <div className="bucket-icon">
          <ShoppingBasket />
        </div>
        <div className="row-actions">
          {bucket.visibility === 'shared' ? (
            <span className="mode-pill">
              <Users size={13} aria-hidden="true" /> {t('shared')}
            </span>
          ) : null}
          <button
            type="button"
            className="icon-button"
            aria-label={`${t('duplicate')} — ${bucket.title}`}
            onClick={() => {
              onDuplicate(bucket);
            }}
          >
            <CopyPlus />
          </button>
          <button
            type="button"
            className="icon-button danger-ghost"
            aria-label={`${t('delete')} — ${bucket.title}`}
            onClick={() => {
              onDelete(bucket);
            }}
          >
            <Trash2 />
          </button>
        </div>
      </div>
      <div>
        <h2>{bucket.title}</h2>
        <p>{bucket.description || `${bucket.items.length} ${t('items')}`}</p>
      </div>
      <div className="bucket-meta">
        <span>
          {bucket.items.filter((item) => item.active).length}{' '}
          {t('availableCount')}
        </span>
        <span>{formatDateTime(bucket.updatedAt, locale)}</span>
      </div>
      <div className="card-actions">
        <Link className="button secondary" to={`/buckets/${bucket.id}/edit`}>
          {t('edit')}
        </Link>
        {bucket.visibility === 'shared' ? (
          <Link className="button" to={`/buckets/${bucket.id}/collaborate`}>
            <Users />
            {t('collaborate')}
          </Link>
        ) : (
          <Link className="button" to={`/buckets/${bucket.id}/order`}>
            {t('orderNow')}
          </Link>
        )}
        <Link
          className="icon-button"
          aria-label={`${t('sharing')} — ${bucket.title}`}
          to={`/buckets/${bucket.id}/share`}
        >
          <Share2 />
        </Link>
        <Link
          className="icon-button"
          aria-label={`${t('members')} — ${bucket.title}`}
          to={`/buckets/${bucket.id}/social-share`}
        >
          <UserRoundPlus />
        </Link>
      </div>
    </article>
  );
}

interface SharedBucketCardProps {
  readonly bucket: Bucket;
  readonly locale: Locale;
  readonly t: (key: MessageKey) => string;
}

export function SharedBucketCard({
  bucket,
  locale,
  t,
}: SharedBucketCardProps) {
  return (
    <article className="bucket-card">
      <div className="bucket-card-top">
        <div className="bucket-icon shared">
          <Users />
        </div>
        <span className="mode-pill">{bucket.ownerName}</span>
      </div>
      <div>
        <h2>{bucket.title}</h2>
        <p>{bucket.description || `${bucket.items.length} ${t('items')}`}</p>
      </div>
      <div className="bucket-meta">
        <span>
          {bucket.items.filter((item) => item.active).length}{' '}
          {t('availableCount')}
        </span>
        <span>{formatDateTime(bucket.updatedAt, locale)}</span>
      </div>
      <div className="card-actions">
        <Link className="button" to={`/buckets/${bucket.id}/collaborate`}>
          <Users />
          {t('collaborate')}
        </Link>
      </div>
    </article>
  );
}
