const ROLE_PRIORITY = {
    viewer: 1,
    contributor: 2,
    editor: 3,
};
export const normalizeEmail = (value) => {
    if (typeof value !== 'string')
        throw new Error('Email must be a string.');
    const normalized = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/u.test(normalized)) {
        throw new Error('Enter a valid email address.');
    }
    return normalized;
};
export const requiredText = (value, label, maxLength) => {
    if (typeof value !== 'string')
        throw new Error(`${label} must be a string.`);
    const normalized = value.trim();
    if (!normalized || normalized.length > maxLength) {
        throw new Error(`${label} must contain between 1 and ${maxLength} characters.`);
    }
    return normalized;
};
export const optionalText = (value, maxLength) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
export const shareRole = (value) => {
    if (value === 'editor' || value === 'contributor' || value === 'viewer') {
        return value;
    }
    throw new Error('A valid sharing role is required.');
};
export const strongestRole = (current, requested) => {
    const normalized = current === 'editor' || current === 'contributor' || current === 'viewer'
        ? current
        : 'viewer';
    return ROLE_PRIORITY[normalized] >= ROLE_PRIORITY[requested]
        ? normalized
        : requested;
};
export const strongestRoleFromGrants = (roles) => {
    const validRoles = roles.filter((role) => role === 'editor' || role === 'contributor' || role === 'viewer');
    const firstRole = validRoles[0];
    if (!firstRole)
        return null;
    return validRoles
        .slice(1)
        .reduce((current, role) => strongestRole(current, role), firstRole);
};
export const mergeAccessSources = (current, sourceId) => {
    const existing = Array.isArray(current)
        ? current.filter((value) => typeof value === 'string')
        : [];
    return [...new Set([...existing, sourceId])].sort((left, right) => left.localeCompare(right));
};
export const removeAccessSource = (current, sourceId) => {
    const existing = Array.isArray(current)
        ? current.filter((value) => typeof value === 'string')
        : [];
    return [...new Set(existing.filter((value) => value !== sourceId))].sort((left, right) => left.localeCompare(right));
};
export const canInviteGroupMember = (status) => status !== 'active' && status !== 'pending';
export const friendRequestId = (senderId, recipientId) => `${senderId}_${recipientId}`;
