export const effectiveMemberCustomItemPermissions = (member) => {
    const editorDefault = member.role === 'editor';
    const canCreateCustomItems = member.canCreateCustomItems ?? editorDefault;
    const canSetCustomItemPrice = (member.canSetCustomItemPrice ?? editorDefault) && canCreateCustomItems;
    return { canCreateCustomItems, canSetCustomItemPrice };
};
export const memberCanPlaceGroupOrder = (member) => member.status === 'active' &&
    (member.role === 'owner' || member.role === 'editor');
