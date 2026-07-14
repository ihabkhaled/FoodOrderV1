export interface MemberPermissionRecord {
  role: 'owner' | 'editor' | 'contributor' | 'viewer';
  canCreateCustomItems?: boolean;
  canSetCustomItemPrice?: boolean;
}

export const effectiveMemberCustomItemPermissions = (
  member: MemberPermissionRecord,
): { canCreateCustomItems: boolean; canSetCustomItemPrice: boolean } => {
  const editorDefault = member.role === 'editor';
  const canCreateCustomItems = member.canCreateCustomItems ?? editorDefault;
  const canSetCustomItemPrice =
    (member.canSetCustomItemPrice ?? editorDefault) && canCreateCustomItems;

  return { canCreateCustomItems, canSetCustomItemPrice };
};
