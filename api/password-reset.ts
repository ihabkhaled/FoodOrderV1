import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import nodemailer from 'nodemailer';

import { PASSWORD_RESET_MAX_BODY_BYTES } from './password-reset.constants';
import type {
  FirebaseServiceAccount,
  PasswordResetEmailCatalog,
  PasswordResetRequest,
  PasswordResetResponse,
} from './password-reset.interfaces';
import passwordResetEmailCopyData from './password-reset.locales.json';

const rateLimitHits = new Map<string, number[]>();
const passwordResetEmailCopy =
  passwordResetEmailCopyData as PasswordResetEmailCatalog;

const requiredString = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
};

const serviceAccount = (): FirebaseServiceAccount | null => {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (encoded) {
    const parsed = JSON.parse(encoded) as Record<string, unknown>;
    const projectId = requiredString(parsed.project_id ?? parsed.projectId, 255);
    const clientEmail = requiredString(parsed.client_email ?? parsed.clientEmail, 255);
    const privateKey = requiredString(parsed.private_key ?? parsed.privateKey, 10_000);
    return projectId && clientEmail && privateKey
      ? {
          projectId,
          clientEmail,
          privateKey: privateKey.replaceAll(String.raw`\n`, '\n'),
        }
      : null;
  }
  const projectId = requiredString(process.env.FIREBASE_ADMIN_PROJECT_ID, 255);
  const clientEmail = requiredString(process.env.FIREBASE_ADMIN_CLIENT_EMAIL, 255);
  const privateKey = requiredString(process.env.FIREBASE_ADMIN_PRIVATE_KEY, 10_000);
  return projectId && clientEmail && privateKey
    ? {
        projectId,
        clientEmail,
        privateKey: privateKey.replaceAll(String.raw`\n`, '\n'),
      }
    : null;
};

export default async function handler(
  request: PasswordResetRequest,
  response: PasswordResetResponse,
) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  const contentLength = Number(request.headers['content-length'] ?? '0');
  if (
    !Number.isFinite(contentLength) ||
    contentLength > PASSWORD_RESET_MAX_BODY_BYTES
  ) {
    response.status(413).json({ error: 'Request is too large.' });
    return;
  }
  const ip =
    (request.headers['x-forwarded-for'] as string | undefined)
      ?.split(',', 1)[0]
      ?.trim() ??
    request.socket.remoteAddress ??
    'unknown';
  const max = Number(process.env.CONTACT_RATE_LIMIT_MAX ?? '3');
  const windowMs = Number(
    process.env.CONTACT_RATE_LIMIT_WINDOW_MS ?? '3600000',
  );
  const now = Date.now();
  const hits = (rateLimitHits.get(ip) ?? []).filter(
    (time) => now - time < windowMs,
  );
  if (hits.length >= max) {
    rateLimitHits.set(ip, hits);
    response
      .status(429)
      .json({ error: 'Too many requests. Please try again later.' });
    return;
  }
  hits.push(now);
  rateLimitHits.set(ip, hits);
  const body =
    typeof request.body === 'object' && request.body
      ? (request.body as Record<string, unknown>)
      : {};
  const email = requiredString(body.email, 200)?.toLowerCase();
  const requestedLocale = requiredString(body.locale, 20) ?? 'en';
  const locale = Object.hasOwn(passwordResetEmailCopy, requestedLocale)
    ? requestedLocale
    : 'en';
  if (!email) {
    response.status(400).json({ error: 'A valid email is required.' });
    return;
  }

  const account = serviceAccount();
  const smtpHost = requiredString(process.env.CONTACT_SMTP_HOST, 255);
  const smtpUser = requiredString(process.env.CONTACT_SMTP_USER, 255);
  const smtpPass = requiredString(process.env.CONTACT_SMTP_PASS, 1000);
  const from = requiredString(process.env.CONTACT_EMAIL_FROM, 255);
  if (!account || !smtpHost || !smtpUser || !smtpPass || !from) {
    response.status(503).json({ error: 'Password reset is currently unavailable.' });
    return;
  }

  try {
    const app =
      getApps()[0] ??
      initializeApp({
        credential: cert(account),
        projectId: account.projectId,
      });
    const firebaseLink = await getAuth(app).generatePasswordResetLink(email);
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.CONTACT_SMTP_PORT ?? '587'),
      secure: process.env.CONTACT_SMTP_SECURE === 'true',
      auth: { user: smtpUser, pass: smtpPass },
    });
    const copy = passwordResetEmailCopy[locale] ?? passwordResetEmailCopy.en;
    await transporter.sendMail({
      from,
      to: email,
      subject: copy.subject,
      text: `${copy.heading}\n\n${copy.action}: ${firebaseLink}\n\n${copy.ignore}`,
      html: `<h1>${copy.heading}</h1><p><a href="${firebaseLink}">${copy.action}</a></p><p>${copy.ignore}</p>`,
    });
  } catch (error) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : '';
    if (code !== 'auth/user-not-found') {
      console.error('Failed to deliver password reset email.', error);
    }
  }

  // Always return the same response to prevent account enumeration.
  response.status(200).json({ ok: true });
}
