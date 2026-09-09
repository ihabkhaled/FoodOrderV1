import { useCallback, useEffect, useState } from 'react';

import type {
  Bucket,
  BucketActivityEvent,
  BucketInvite,
  BucketMember,
  BucketRole,
  Locale,
  SessionUser,
  SharedBucketView,
} from '@/modules/data-access';
import { sharingService } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { useParams } from '@/packages/router';
import { copyToClipboard, shareText } from '@/platform/browser';
import type { MessageKey } from '@/shared/i18n';
import { useUndoableDelete } from '@/shared/ui';

import type { GroupOrderMessageKey } from '../i18n/group-order-messages.constants';
import { translateGroupOrder } from '../i18n/translate-group-order.helper';

export interface BucketShareViewModel {
  user: SessionUser | null;
  locale: Locale;
  t: (key: MessageKey) => string;
  gt: (key: GroupOrderMessageKey) => string;
  view: SharedBucketView | null;
  invites: BucketInvite[];
  activity: BucketActivityEvent[];
  loading: boolean;
  error: string;
  reload: () => void;
  inviteRole: Exclude<BucketRole, 'owner'>;
  setInviteRole: (role: Exclude<BucketRole, 'owner'>) => void;
  creating: boolean;
  joinCode: string;
  copiedCode: boolean;
  removing: BucketMember | null;
  setRemoving: (member: BucketMember | null) => void;
  confirmingFreeze: boolean;
  setConfirmingFreeze: (confirming: boolean) => void;
  enabling: boolean;
  enable: () => Promise<void>;
  freeze: () => Promise<void>;
  reopen: () => Promise<void>;
  createInvite: () => Promise<void>;
  shareOrCopy: () => Promise<void>;
  revokeInvite: (inviteId: string) => Promise<void>;
  changeRole: (
    member: BucketMember,
    role: Exclude<BucketRole, 'owner'>,
  ) => Promise<void>;
  changeCustomPermissions: (
    member: BucketMember,
    patch: Partial<
      Pick<BucketMember, 'canCreateCustomItems' | 'canSetCustomItemPrice'>
    >,
  ) => Promise<void>;
  removeMember: () => void;
}

const withoutMember = (
  view: SharedBucketView | null,
  member: BucketMember,
): SharedBucketView | null =>
  view
    ? {
        ...view,
        members: view.members.filter(
          (existing) => existing.userId !== member.userId,
        ),
      }
    : view;

const withMemberRestored = (
  view: SharedBucketView | null,
  member: BucketMember,
): SharedBucketView | null =>
  view && !view.members.some((existing) => existing.userId === member.userId)
    ? { ...view, members: [...view.members, member] }
    : view;

export function useBucketShare(): BucketShareViewModel {
  const { bucketId } = useParams();
  const { user, locale, t, showToast } = useApp();
  const gt = (key: GroupOrderMessageKey) => translateGroupOrder(locale, key);
  const [view, setView] = useState<SharedBucketView | null>(null);
  const undoableMemberRemoval = useUndoableDelete();
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

  const updateBucket = (bucket: Bucket): void => {
    setView((current) => (current ? { ...current, bucket } : current));
  };

  const runBucketAction = async (
    action: () => Promise<Bucket>,
    successMessage: string,
  ): Promise<void> => {
    try {
      updateBucket(await action());
      showToast(successMessage, 'success');
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    }
  };

  const enable = async (): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      setEnabling(true);
      await sharingService.enableSharing(user, bucketId);
      showToast(t('sharingEnabled'), 'success');
      await load();
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    } finally {
      setEnabling(false);
    }
  };

  const freeze = async (): Promise<void> => {
    if (!user || !bucketId) return;
    await runBucketAction(
      () => sharingService.freezeBucket(user, bucketId),
      gt('bucketFrozen'),
    );
    setConfirmingFreeze(false);
  };

  const reopen = async (): Promise<void> => {
    if (!user || !bucketId) return;
    await runBucketAction(
      () => sharingService.unfreezeBucket(user, bucketId),
      gt('bucketReopened'),
    );
  };

  const createInvite = async (): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      setCreating(true);
      setCopiedCode(false);
      const result = await sharingService.createInvite(
        user,
        bucketId,
        inviteRole,
      );
      setJoinCode(result.joinCode);
      setInvites((current) => [result.invite, ...current]);
      showToast(t('inviteCreated'), 'success');
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    } finally {
      setCreating(false);
    }
  };

  const shareOrCopy = async (): Promise<void> => {
    if (!joinCode) return;
    const shared = await shareText(t('joinBucket'), joinCode);
    if (!shared) {
      await copyToClipboard(joinCode);
      showToast(t('copied'), 'success');
    }
    setCopiedCode(true);
  };

  const revokeInvite = async (inviteId: string): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      await sharingService.revokeInvite(user, bucketId, inviteId);
      setInvites((current) =>
        current.map((invite) =>
          invite.id === inviteId
            ? { ...invite, status: 'revoked' as const }
            : invite,
        ),
      );
      showToast(t('inviteRevoked'), 'success');
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    }
  };

  const replaceMember = (saved: BucketMember): void => {
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
  ): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      replaceMember(
        await sharingService.changeMemberRole(
          user,
          bucketId,
          member.userId,
          role,
        ),
      );
      showToast(t('roleChanged'), 'success');
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    }
  };

  const changeCustomPermissions = async (
    member: BucketMember,
    patch: Partial<
      Pick<BucketMember, 'canCreateCustomItems' | 'canSetCustomItemPrice'>
    >,
  ): Promise<void> => {
    if (!user || !bucketId) return;
    try {
      replaceMember(
        await sharingService.setMemberCustomItemPermissions(
          user,
          bucketId,
          member.userId,
          {
            canCreateCustomItems:
              patch.canCreateCustomItems ??
              member.canCreateCustomItems ??
              false,
            canSetCustomItemPrice:
              patch.canSetCustomItemPrice ??
              member.canSetCustomItemPrice ??
              false,
          },
        ),
      );
      showToast(gt('permissionsSaved'), 'success');
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    }
  };

  // Hides the member from the list the moment removal is confirmed, but
  // does not call revokeMember until the undo window on the toast this
  // raises has closed - so "Undo" restores access that was never actually
  // revoked, rather than having to grant it back.
  const removeMember = (): void => {
    if (!user || !bucketId || !removing) return;
    const member = removing;
    setRemoving(null);
    setView((current) => withoutMember(current, member));
    undoableMemberRemoval.schedule(member.userId, async () => {
      try {
        await sharingService.revokeMember(user, bucketId, member.userId);
      } catch (error_) {
        showToast(
          error_ instanceof Error ? error_.message : t('tryAgain'),
          'error',
        );
        setView((current) => withMemberRestored(current, member));
      }
    });
    showToast(t('memberRemoved'), 'success', {
      label: t('undo'),
      onClick: () => {
        if (undoableMemberRemoval.cancel(member.userId)) {
          setView((current) => withMemberRestored(current, member));
          showToast(t('undone'), 'info');
        }
      },
    });
  };

  return {
    user,
    locale,
    t,
    gt,
    view,
    invites,
    activity,
    loading,
    error,
    reload: () => {
      void load();
    },
    inviteRole,
    setInviteRole,
    creating,
    joinCode,
    copiedCode,
    removing,
    setRemoving,
    confirmingFreeze,
    setConfirmingFreeze,
    enabling,
    enable,
    freeze,
    reopen,
    createInvite,
    shareOrCopy,
    revokeInvite,
    changeRole,
    changeCustomPermissions,
    removeMember,
  };
}
