export const requestPasswordResetEmail = async (
  email: string,
  locale: string,
): Promise<void> => {
  const response = await fetch('/api/password-reset', {
    method: 'POST',
    body: new URLSearchParams({ email, locale }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!response.ok) throw new Error('Password reset request failed.');
};
