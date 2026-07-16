export interface CustomItemPermissionSource {
  role: 'owner' | 'editor' | 'contributor' | 'viewer';
  canCreateCustomItems?: boolean;
  canSetCustomItemPrice?: boolean;
}

export interface EffectiveCustomItemPermissions {
  canCreateCustomItems: boolean;
  canSetCustomItemPrice: boolean;
}

export const effectiveCustomItemPermissions = (
  member: CustomItemPermissionSource | null | undefined,
): EffectiveCustomItemPermissions => {
  if (!member) {
    return { canCreateCustomItems: false, canSetCustomItemPrice: false };
  }

  const editorDefault = member.role === 'editor';
  const canCreateCustomItems = member.canCreateCustomItems ?? editorDefault;
  const canSetCustomItemPrice =
    (member.canSetCustomItemPrice ?? editorDefault) && canCreateCustomItems;

  return { canCreateCustomItems, canSetCustomItemPrice };
};
