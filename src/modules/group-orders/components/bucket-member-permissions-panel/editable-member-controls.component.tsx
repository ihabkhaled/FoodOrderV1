import type { BucketMember, BucketRole, Locale } from '@/modules/data-access';
import { ASSIGNABLE_ROLES } from '@/modules/data-access';
import { UserMinus } from '@/packages/icons';
import type { MessageKey } from '@/shared/i18n';

import type { GroupOrderMessageKey } from '../../i18n/group-order-messages.constants';
import { translateGroupOrder } from '../../i18n/translate-group-order.helper';

const ROLE_LABEL: Record<BucketRole, MessageKey> = {
  owner: 'roleOwner',
  editor: 'roleEditor',
  contributor: 'roleContributor',
  viewer: 'roleViewer',
};

interface EditableMemberControlsProps {
  member: BucketMember;
  locale: Locale;
  translate: (key: MessageKey) => string;
  onRoleChange: (
    member: BucketMember,
    role: Exclude<BucketRole, 'owner'>,
  ) => void;
  onPermissionChange: (
    member: BucketMember,
    patch: Partial<
      Pick<BucketMember, 'canCreateCustomItems' | 'canSetCustomItemPrice'>
    >,
  ) => void;
  onRemove: (member: BucketMember) => void;
}

export function EditableMemberControls({
  member,
  locale,
  translate,
  onRoleChange,
  onPermissionChange,
  onRemove,
}: EditableMemberControlsProps) {
  const groupTranslate = (key: GroupOrderMessageKey) =>
    translateGroupOrder(locale, key);

  return (
    <div className="member-controls">
      <select
        aria-label={`${translate('role')} — ${member.displayName}`}
        value={member.role}
        onChange={(event) => {
          onRoleChange(
            member,
            event.target.value as Exclude<BucketRole, 'owner'>,
          );
        }}
      >
        {ASSIGNABLE_ROLES.map((role) => (
          <option key={role} value={role}>
            {translate(ROLE_LABEL[role])}
          </option>
        ))}
      </select>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={member.canCreateCustomItems ?? false}
          onChange={(event) => {
            onPermissionChange(member, {
              canCreateCustomItems: event.target.checked,
            });
          }}
        />
        {groupTranslate('allowCustomItems')}
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={member.canSetCustomItemPrice ?? false}
          disabled={!member.canCreateCustomItems}
          onChange={(event) => {
            onPermissionChange(member, {
              canSetCustomItemPrice: event.target.checked,
            });
          }}
        />
        {groupTranslate('allowCustomPrice')}
      </label>
      <button
        className="icon-button danger-ghost"
        aria-label={`${translate('removeMember')} — ${member.displayName}`}
        onClick={() => {
          onRemove(member);
        }}
      >
        <UserMinus />
      </button>
    </div>
  );
}
