import { translateGroupOrder } from '@/i18n/groupOrderMessages';
import type { BucketMember, BucketRole, Locale } from '@/modules/data-access';
import { ASSIGNABLE_ROLES } from '@/modules/data-access';
import { UserMinus, Users } from '@/packages/icons';
import type { MessageKey } from '@/shared/i18n';

const ROLE_LABEL: Record<BucketRole, MessageKey> = {
  owner: 'roleOwner',
  editor: 'roleEditor',
  contributor: 'roleContributor',
  viewer: 'roleViewer',
};

interface BucketMemberPermissionsPanelProps {
  members: BucketMember[];
  currentUserId: string;
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

function EditableMemberControls({
  member,
  locale,
  translate,
  onRoleChange,
  onPermissionChange,
  onRemove,
}: Omit<BucketMemberPermissionsPanelProps, 'members' | 'currentUserId'> & {
  member: BucketMember;
}) {
  const groupTranslate = (key: Parameters<typeof translateGroupOrder>[1]) =>
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

export function BucketMemberPermissionsPanel({
  members,
  currentUserId,
  locale,
  translate,
  onRoleChange,
  onPermissionChange,
  onRemove,
}: BucketMemberPermissionsPanelProps) {
  return (
    <section className="section-card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{translate('members')}</p>
          <h2>
            <Users size={18} aria-hidden="true" /> {members.length}
          </h2>
        </div>
      </div>
      <ul className="list plain">
        {members.map((member) => (
          <li className="member-permission-row" key={member.userId}>
            <div className="member-identity">
              <strong>
                {member.displayName}
                {member.userId === currentUserId ? ` (${translate('you')})` : ''}
              </strong>
              <span className="muted">{member.email}</span>
            </div>
            {member.role === 'owner' ? (
              <span className="mode-pill">{translate('roleOwner')}</span>
            ) : (
              <EditableMemberControls
                member={member}
                locale={locale}
                translate={translate}
                onRoleChange={onRoleChange}
                onPermissionChange={onPermissionChange}
                onRemove={onRemove}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
