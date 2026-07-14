export interface MemberPermissionRecord {
  role: 'owner' | 'editor' | 'contributor' | 'viewer';
  canCreateCustomItems?: boolean;
  canSetCustomItemPrice?: boolean;
}

export interface MemberOrderPermissionRecord extends MemberPermissionRecord {
  status: 'active' | 'revoked' | 'left';
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

export const memberCanPlaceGroupOrder = (
  member: MemberOrderPermissionRecord,
): boolean =>
  member.status === 'active' &&
  (member.role === 'owner' || member.role === 'editor');
