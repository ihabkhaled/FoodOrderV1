import { ArrowLeft, Lock, LockOpen, Share2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ActivityTimeline } from '@/components/ActivityTimeline';
import { BucketInvitePanel } from '@/components/BucketInvitePanel';
import { BucketMemberPermissionsPanel } from '@/components/BucketMemberPermissionsPanel';
import { BucketPricingPanel } from '@/components/BucketPricingPanel';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { translateGroupOrder } from '@/i18n/groupOrderMessages';
import { sharingService } from '@/services';
import type { SharedBucketView } from '@/services/contracts';
import { copyToClipboard, shareText } from '@/services/platform';
import { useApp } from '@/state/AppContext';
import type {
  Bucket,
  BucketActivityEvent,
  BucketInvite,
  BucketMember,
  BucketPricingPolicy,
  BucketRole,
} from '@/types/domain';

interface BucketStateControlsProps {
  bucket: Bucket;
  freezeLabel: string;
  reopenLabel: string;
  onFreeze: () => void;
  onReopen: () => void;
}

function BucketStateControls({
  bucket,
  freezeLabel,
  reopenLabel,
  onFreeze,
  onReopen,
}: BucketStateControlsProps) {
  const state = bucket.orderState ?? 'open';

  if (state === 'open') {
    return (
      <button className="button secondary" onClick={onFreeze}>
        <Lock />
        {freezeLabel}
      </button>
    );
  }

  if (state === 'frozen') {
    return (
      <button className="button secondary" onClick={onReopen}>
        <LockOpen />
        {reopenLabel}
      </button>
    );
  }

  return null;
}

function BucketStateBanner({ bucket, locale }: { bucket: Bucket; locale: 'en' | 'ar' }) {
  const state = bucket.orderState ?? 'open';
  if (state === 'open') return null;

  const key = state === 'ordered' ? 'orderedBucket' : 'frozenBucket';

  return (
    <div className="status-banner warning" role="status">
      <Lock aria-hidden="true" />
      <span>{translateGroupOrder(locale, key)}</span>
    </div>
  );
}

export function BucketSharePage() {
  const { bucketId } = useParams();
  const { user, locale, t, showToast } = useApp();
  const gt = (key: Parameters<typeof translateGroupOrder>[1]) =>
    translateGroupOrder(locale, key);
  const [view, setView] = useState<SharedBucketView | null>(null);
  const [invites, setInvites] = useState<BucketInvite[]>([]);
  const [activity, setActivity] = useState<BucketActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteRole, setInviteRole] =
    useState<Exclude<BucketRole, 'owner'>>('contributor');
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [removing, setRemoving] = useState<BucketMember | null>(null);
  const [confirmingFreeze, setConfirmingFreeze] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);

  const load = useCallback(async () => {
    if (!user || !bucketId) return;
    try {
      setError('');
      const nextView = await sharingService.getSharedBucketView(user, bucketId);
      if (!nextView) throw new Error(t('notAllowed'));
      if (nextView.myRole !== 'owner') throw new Error(t('onlyOwnerCanManage'));
      setView(nextView);
      if (nextView.bucket.visibility === 'shared') {
        const [nextInvites, nextActivity] = await Promise.all([
          sharingService.listInvites(user, bucketId),
          sharingService.listActivity(user, bucketId).catch(() => []),
        ]);
        setInvites(nextInvites);
        setActivity(nextActivity);
      }
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('tryAgain'));
    } finally {
      setLoading(false);
    }
  }, [user, bucketId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateBucket = (bucket: Bucket) => {
    setView((current) => (current ? { ...current, bucket } : current));
  };

  const runBucketAction = async (
    action: () => Promise<Bucket>,
    successMessage: string,
  ) => {
    try {
      updateBucket(await action());
      showToast(successMessage, 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    }
  };

  const enable = async () => {
    if (!user || !bucketId) return;
    try {
      setEnabling(true);
      await sharingService.enableSharing(user, bucketId);
      showToast(t('sharingEnabled'), 'success');
      await load();
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setEnabling(false);
    }
  };

  const savePricing = async (policy: BucketPricingPolicy) => {
    if (!user || !bucketId) return;
    setSavingPricing(true);
    await runBucketAction(
      () => sharingService.updatePricingPolicy(user, bucketId, policy),
      gt('pricingSaved'),
    );
    setSavingPricing(false);
  };

  const freeze = async () => {
    if (!user || !bucketId) return;
    await runBucketAction(
      () => sharingService.freezeBucket(user, bucketId),
      gt('bucketFrozen'),
    );
    setConfirmingFreeze(false);
  };

  const reopen = async () => {
    if (!user || !bucketId) return;
    await runBucketAction(
      () => sharingService.unfreezeBucket(user, bucketId),
      gt('bucketReopened'),
    );
  };

  const createInvite = async () => {
    if (!user || !bucketId) return;
    try {
      setCreating(true);
      setCopiedCode(false);
      const result = await sharingService.createInvite(user, bucketId, inviteRole);
      setJoinCode(result.joinCode);
      setInvites((current) => [result.invite, ...current]);
      showToast(t('inviteCreated'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const shareOrCopy = async () => {
    if (!joinCode) return;
    const shared = await shareText(t('joinBucket'), joinCode);
    if (!shared) {
      await copyToClipboard(joinCode);
      showToast(t('copied'), 'success');
    }
    setCopiedCode(true);
  };

  const revokeInvite = async (inviteId: string) => {
    if (!user || !bucketId) return;
    try {
      await sharingService.revokeInvite(user, bucketId, inviteId);
      setInvites((current) =>
        current.map((invite) =>
          invite.id === inviteId ? { ...invite, status: 'revoked' as const } : invite,
        ),
      );
      showToast(t('inviteRevoked'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    }
  };

  const replaceMember = (saved: BucketMember) => {
    setView((current) =>
      current
        ? {
            ...current,
            members: current.members.map((member) =>
              member.userId === saved.userId ? saved : member,
            ),
          }
        : current,
    );
  };

  const changeRole = async (
    member: BucketMember,
    role: Exclude<BucketRole, 'owner'>,
  ) => {
    if (!user || !bucketId) return;
    try {
      replaceMember(
        await sharingService.changeMemberRole(user, bucketId, member.userId, role),
      );
      showToast(t('roleChanged'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    }
  };

  const changeCustomPermissions = async (
    member: BucketMember,
    patch: Partial<
      Pick<BucketMember, 'canCreateCustomItems' | 'canSetCustomItemPrice'>
    >,
  ) => {
    if (!user || !bucketId) return;
    try {
      replaceMember(
        await sharingService.setMemberCustomItemPermissions(
          user,
          bucketId,
          member.userId,
          {
            canCreateCustomItems:
              patch.canCreateCustomItems ?? member.canCreateCustomItems ?? false,
            canSetCustomItemPrice:
              patch.canSetCustomItemPrice ?? member.canSetCustomItemPrice ?? false,
          },
        ),
      );
      showToast(gt('permissionsSaved'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    }
  };

  const removeMember = async () => {
    if (!user || !bucketId || !removing) return;
    try {
      await sharingService.revokeMember(user, bucketId, removing.userId);
      setView((current) =>
        current
          ? {
              ...current,
              members: current.members.filter(
                (member) => member.userId !== removing.userId,
              ),
            }
          : current,
      );
      showToast(t('memberRemoved'), 'success');
    } catch (error_) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setRemoving(null);
    }
  };

  if (loading) return <Loading />;
  if (!view || error) {
    return (
      <ErrorState
        message={error || t('notAllowed')}
        onRetry={() => {
          void load();
        }}
      />
    );
  }

  const { bucket, members } = view;
  const isOpen = (bucket.orderState ?? 'open') === 'open';

  return (
    <div className="page narrow stack-lg">
      <Link className="back-link" to={`/buckets/${bucket.id}/collaborate`}>
        <ArrowLeft />
        {t('back')}
      </Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">{t('sharing')}</p>
          <h1>{bucket.title}</h1>
        </div>
        <BucketStateControls
          bucket={bucket}
          freezeLabel={gt('freezeBucket')}
          reopenLabel={gt('unfreezeBucket')}
          onFreeze={() => {
            setConfirmingFreeze(true);
          }}
          onReopen={() => {
            void reopen();
          }}
        />
      </header>

      <BucketStateBanner bucket={bucket} locale={locale} />
      <BucketPricingPanel
        locale={locale}
        policy={bucket.pricingPolicy}
        disabled={!isOpen}
        saving={savingPricing}
        translate={t}
        onSave={(policy) => {
          void savePricing(policy);
        }}
      />

      {bucket.visibility === 'shared' ? (
        <>
          <BucketInvitePanel
            locale={locale}
            invites={invites}
            inviteRole={inviteRole}
            creating={creating}
            joinCode={joinCode}
            copiedCode={copiedCode}
            translate={t}
            onRoleChange={setInviteRole}
            onCreate={() => {
              void createInvite();
            }}
            onShare={() => {
              void shareOrCopy();
            }}
            onRevoke={(inviteId) => {
              void revokeInvite(inviteId);
            }}
          />
          <BucketMemberPermissionsPanel
            members={members}
            currentUserId={user.id}
            locale={locale}
            translate={t}
            onRoleChange={(member, role) => {
              void changeRole(member, role);
            }}
            onPermissionChange={(member, patch) => {
              void changeCustomPermissions(member, patch);
            }}
            onRemove={setRemoving}
          />
          <section className="section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t('activity')}</p>
                <h2>{t('activity')}</h2>
              </div>
            </div>
            <ActivityTimeline events={activity} />
          </section>
        </>
      ) : (
        <section className="section-card stack">
          <p>{t('sharingDisabledHint')}</p>
          <button
            className="button"
            disabled={enabling}
            onClick={() => {
              void enable();
            }}
          >
            <Share2 />
            {enabling ? t('loading') : t('enableSharing')}
          </button>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title={t('removeMember')}
        message={t('confirmRemoveMember')}
        confirmLabel={t('removeMember')}
        cancelLabel={t('cancel')}
        danger
        onConfirm={() => {
          void removeMember();
        }}
        onCancel={() => {
          setRemoving(null);
        }}
      />
      <ConfirmDialog
        open={confirmingFreeze}
        title={gt('freezeBucket')}
        message={gt('confirmFreeze')}
        confirmLabel={gt('freezeBucket')}
        cancelLabel={t('cancel')}
        onConfirm={() => {
          void freeze();
        }}
        onCancel={() => {
          setConfirmingFreeze(false);
        }}
      />
    </div>
  );
}
