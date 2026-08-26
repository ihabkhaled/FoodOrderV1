import type { CreatedInviteLink, Locale } from '@/modules/data-access';
import { Check, Copy, Share2 } from '@/packages/icons';
import { formatDateTime } from '@/shared/helpers';
import type { MessageKey } from '@/shared/i18n';

export interface InviteLinkShareCardProps {
  locale: Locale;
  title: string;
  description: string;
  actionLabel: string;
  link: CreatedInviteLink | null;
  creating: boolean;
  sharing: boolean;
  copied: boolean;
  onCreate: () => void;
  onShare: () => void;
  t: (key: MessageKey) => string;
}

/**
 * Creates a link and offers it to the share sheet.
 *
 * The expiry is stated in full rather than implied: a link handed round a chat
 * outlives the conversation that produced it, so the person sharing it should
 * know when it stops working.
 */
export function InviteLinkShareCard({
  locale,
  title,
  description,
  actionLabel,
  link,
  creating,
  sharing,
  copied,
  onCreate,
  onShare,
  t,
}: InviteLinkShareCardProps) {
  return (
    <section className="section-card stack invite-link-share">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('inviteLinkShareEyebrow')}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <p className="muted">{description}</p>
      <button
        type="button"
        className="button"
        onClick={onCreate}
        disabled={creating}
        aria-busy={creating}
      >
        <Share2 />
        {creating ? t('loading') : actionLabel}
      </button>
      {link ? (
        <div className="join-code-box" role="status">
          <p className="muted">
            {t('inviteLinkExpires')} {formatDateTime(link.expiresAt, locale)}
          </p>
          <code className="join-code">{link.url}</code>
          <button
            type="button"
            className="button secondary"
            onClick={onShare}
            disabled={sharing}
            aria-busy={sharing}
          >
            {copied ? <Check /> : <Copy />}
            {t('inviteLinkShareAction')}
          </button>
        </div>
      ) : null}
    </section>
  );
}
