import type { BucketMember, BucketRole, Locale } from '@/modules/data-access';
import { Users } from '@/packages/icons';
import type { MessageKey } from '@/shared/i18n';

import { EditableMemberControls } from './editable-member-controls.component';

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
                {member.userId === currentUserId
                  ? ` (${translate('you')})`
                  : ''}
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
