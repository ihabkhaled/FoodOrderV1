import { beforeEach, describe, expect, it } from 'vitest';

import type {
  AppNotification,
  ProfileDefaults,
  SessionUser,
} from '@/modules/data-access';
import {
  LocalAuthService,
  LocalDataService,
  LocalNotificationService,
  LocalSharingService,
  LocalSocialManagementService,
} from '@/modules/data-access';

const NOTIFICATION_KEY = 'foodorder:v1:notifications';
const TEST_PASSWORD = 'Password1';
const defaults: ProfileDefaults = {
  locale: 'en',
  theme: 'system',
  defaultCurrency: 'EGP',
};

/** Switches the active session through the auth service, as the app does. */
const switchUser = async (user: SessionUser): Promise<void> => {
  await new LocalAuthService().login(user.email, TEST_PASSWORD);
};

const notificationsFor = (userId: string): AppNotification[] => {
  let notifications: AppNotification[] = [];
  const unsubscribe = new LocalNotificationService().subscribe(
    userId,
    (next) => {
      notifications = next;
    },
  );
  unsubscribe();
  return notifications;
};

describe('targeted bucket invitations', () => {
  const auth = new LocalAuthService();
  const data = new LocalDataService();
  const sharing = new LocalSharingService();
  const social = new LocalSocialManagementService();
  let owner: SessionUser;
  let recipient: SessionUser;
  let intruder: SessionUser;

  beforeEach(async () => {
    localStorage.clear();
    owner = await auth.register(
      'Bucket Owner',
      'owner@example.com',
      TEST_PASSWORD,
      defaults,
    );
    recipient = await auth.register(
      'Intended Recipient',
      'recipient@example.com',
      TEST_PASSWORD,
      defaults,
    );
    intruder = await auth.register(
      'Other User',
      'other@example.com',
      TEST_PASSWORD,
      defaults,
    );
    await switchUser(owner);
    await social.sendFriendRequest(recipient.email);
    await switchUser(recipient);
    await social.respondFriendRequest(owner.id, 'accepted');
    localStorage.removeItem(NOTIFICATION_KEY);
  });

  it('delivers one actionable friend-request notification to a new recipient', async () => {
    const freshRecipient = await auth.register(
      'Fresh Recipient',
      'fresh-recipient@example.com',
      TEST_PASSWORD,
      defaults,
    );
    await switchUser(owner);

    await social.sendFriendRequest(freshRecipient.email);

    expect(notificationsFor(freshRecipient.id)).toEqual([
      expect.objectContaining({
        kind: 'friend_request',
        route: '/social',
        entityId: owner.id,
        actorId: owner.id,
        actorName: owner.displayName,
      }),
    ]);
  });

  it('withholds access until the intended recipient accepts and notifies the owner once', async () => {
    await switchUser(owner);
    const bucket = await data.createBucket(owner, {
      title: 'Private team lunch',
      description: '',
      currency: 'EGP',
      items: [
        {
          id: '',
          name: 'Meal',
          description: '',
          category: '',
          unitPrice: 100,
          active: true,
        },
      ],
    });
    const invitation = await social.inviteFriendToBucket(
      bucket.id,
      recipient.id,
      'contributor',
    );
    expect(invitation.status).toBe('pending');
    expect(await sharing.listSharedWithMe(recipient)).toEqual([]);
    expect(notificationsFor(recipient.id)).toEqual([
      expect.objectContaining({
        kind: 'bucket_invitation',
        route: '/social',
        entityId: bucket.id,
      }),
    ]);

    await switchUser(intruder);
    await expect(
      social.respondBucketInvitation(bucket.id, 'accepted'),
    ).rejects.toThrow(/not found/i);
    expect(await sharing.listSharedWithMe(intruder)).toEqual([]);

    await switchUser(recipient);
    const pendingOverview = await social.getOverview();
    expect(pendingOverview.bucketInvitations).toEqual([
      expect.objectContaining({ bucketId: bucket.id, status: 'pending' }),
    ]);
    await social.respondBucketInvitation(bucket.id, 'accepted');
    await social.respondBucketInvitation(bucket.id, 'accepted');

    const acceptedBuckets = await sharing.listSharedWithMe(recipient);
    expect(acceptedBuckets.map((item) => item.id)).toEqual([bucket.id]);
    const acceptedOverview = await social.getOverview();
    expect(acceptedOverview.bucketInvitations).toEqual([]);
    expect(
      notificationsFor(owner.id).filter(
        (notification) => notification.kind === 'bucket_invitation_accepted',
      ),
    ).toEqual([
      expect.objectContaining({
        route: `/buckets/${bucket.id}/collaborate`,
        actorId: recipient.id,
      }),
    ]);
  });

  it('reactivates a revoked editor only with the newly invited viewer role', async () => {
    await switchUser(owner);
    const bucket = await data.createBucket(owner, {
      title: 'Rejoin with lower access',
      description: '',
      currency: 'EGP',
      items: [
        {
          id: '',
          name: 'Meal',
          description: '',
          category: '',
          unitPrice: 75,
          active: true,
        },
      ],
    });
    await sharing.enableSharing(owner, bucket.id);
    const { joinCode } = await sharing.createInvite(owner, bucket.id, 'editor');
    await sharing.acceptJoinCode(recipient, joinCode);
    await sharing.revokeMember(owner, bucket.id, recipient.id);

    await social.inviteFriendToBucket(bucket.id, recipient.id, 'viewer');
    await switchUser(recipient);
    await social.respondBucketInvitation(bucket.id, 'accepted');

    const view = await sharing.getSharedBucketView(recipient, bucket.id);
    const member = view?.members.find(
      (candidate) => candidate.userId === recipient.id,
    );
    expect(view?.myRole).toBe('viewer');
    expect(member).toMatchObject({
      role: 'viewer',
      canCreateCustomItems: false,
      canSetCustomItemPrice: false,
    });
  });

  it('lets the recipient dismiss a pending invitation after bucket deletion', async () => {
    await switchUser(owner);
    const bucket = await data.createBucket(owner, {
      title: 'Deleted invitation target',
      description: '',
      currency: 'EGP',
      items: [
        {
          id: '',
          name: 'Meal',
          description: '',
          category: '',
          unitPrice: 60,
          active: true,
        },
      ],
    });
    await social.inviteFriendToBucket(bucket.id, recipient.id, 'viewer');
    await data.deleteBucket(owner, bucket.id);

    await switchUser(recipient);
    await social.respondBucketInvitation(bucket.id, 'declined');
    await social.respondBucketInvitation(bucket.id, 'declined');

    const overview = await social.getOverview();
    expect(overview.bucketInvitations).toEqual([]);
    expect(
      notificationsFor(owner.id).filter(
        (notification) => notification.kind === 'bucket_invitation_declined',
      ),
    ).toEqual([]);
  });

  it('keeps declined invitations access-free and preserves legacy active grants', async () => {
    await switchUser(owner);
    const declinedBucket = await data.createBucket(owner, {
      title: 'Declined lunch',
      description: '',
      currency: 'EGP',
      items: [
        {
          id: '',
          name: 'Meal',
          description: '',
          category: '',
          unitPrice: 80,
          active: true,
        },
      ],
    });
    await social.inviteFriendToBucket(
      declinedBucket.id,
      recipient.id,
      'viewer',
    );
    await switchUser(recipient);
    await social.respondBucketInvitation(declinedBucket.id, 'declined');
    expect(await sharing.listSharedWithMe(recipient)).toEqual([]);

    await switchUser(owner);
    const legacyBucket = await data.createBucket(owner, {
      title: 'Existing direct access',
      description: '',
      currency: 'EGP',
      items: [
        {
          id: '',
          name: 'Meal',
          description: '',
          category: '',
          unitPrice: 90,
          active: true,
        },
      ],
    });
    await social.shareBucketWithUser(legacyBucket.id, recipient.id, 'editor');
    await expect(
      social.inviteFriendToBucket(
        legacyBucket.id,
        recipient.id,
        'viewer',
      ),
    ).rejects.toThrow(/already shared/i);
    const sharedBuckets = await sharing.listSharedWithMe(recipient);
    expect(sharedBuckets.map((item) => item.id)).toContain(legacyBucket.id);
  });
});
