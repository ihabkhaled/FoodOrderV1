import type { ContactSubmissionResult } from './contact-submission.interfaces';

export const submitContactForm = async (
  form: HTMLFormElement,
): Promise<ContactSubmissionResult> => {
  const response = await fetch('/api/contact', {
    method: 'POST',
    body: new URLSearchParams(
      [...new FormData(form).entries()].map(([key, value]) => [
        key,
        typeof value === 'string' ? value : value.name,
      ]),
    ),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const body = (await response.json()) as Partial<ContactSubmissionResult>;
  if (!response.ok || body.ok !== true) throw new Error('Contact request failed.');
  return { ok: true, ...(body.previewUrl ? { previewUrl: body.previewUrl } : {}) };
};
