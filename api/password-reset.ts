import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import nodemailer from 'nodemailer';

import { PASSWORD_RESET_MAX_BODY_BYTES } from './password-reset.constants';
import type {
  FirebaseServiceAccount,
  PasswordResetEmailCatalog,
  PasswordResetRequest,
  PasswordResetResponse,
  PasswordResetTransportConfiguration,
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
  const encoded =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ??
    process.env.FIREBASE_SERVICE_ACCOUNT ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (encoded) {
    try {
      const parsed = JSON.parse(encoded) as Record<string, unknown>;
      const projectId = requiredString(
        parsed.project_id ?? parsed.projectId,
        255,
      );
      const clientEmail = requiredString(
        parsed.client_email ?? parsed.clientEmail,
        255,
      );
      const privateKey = requiredString(
        parsed.private_key ?? parsed.privateKey,
        10_000,
      );
      return projectId && clientEmail && privateKey
        ? {
            projectId,
            clientEmail,
            privateKey: privateKey.replaceAll(String.raw`\n`, '\n'),
          }
        : null;
    } catch {
      return null;
    }
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

const transportConfiguration = (
  firebaseAdmin: boolean,
  smtpHost: string | null,
  smtpUser: string | null,
  smtpPass: string | null,
  from: string | null,
): PasswordResetTransportConfiguration | null =>
  firebaseAdmin && smtpHost && smtpUser && smtpPass && from
    ? { smtpHost, smtpUser, smtpPass, from }
    : null;

const isRateLimited = (request: PasswordResetRequest): boolean => {
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
    return true;
  }
  hits.push(now);
  rateLimitHits.set(ip, hits);
  return false;
};

const passwordResetInput = (request: PasswordResetRequest) => {
  const body =
    typeof request.body === 'object' && request.body
      ? (request.body as Record<string, unknown>)
      : {};
  const email = requiredString(body.email, 200)?.toLowerCase();
  const requestedLocale = requiredString(body.locale, 20) ?? 'en';
  const locale = Object.hasOwn(passwordResetEmailCopy, requestedLocale)
    ? requestedLocale
    : 'en';
  return email ? { email, locale } : null;
};

const localizedFirebaseLink = (firebaseLink: string, locale: string): string => {
  const link = new URL(firebaseLink);
  link.searchParams.set('lang', locale);
  return link.toString();
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
  if (isRateLimited(request)) {
    response
      .status(429)
      .json({ error: 'Too many requests. Please try again later.' });
    return;
  }
  const input = passwordResetInput(request);
  if (!input) {
    response.status(400).json({ error: 'A valid email is required.' });
    return;
  }
  const { email, locale } = input;

  const account = serviceAccount();
  const applicationDefaultCredentials = requiredString(
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    1000,
  );
  const smtpHost = requiredString(process.env.CONTACT_SMTP_HOST, 255);
  const smtpUser = requiredString(process.env.CONTACT_SMTP_USER, 255);
  const smtpPass = requiredString(process.env.CONTACT_SMTP_PASS, 1000);
  const from = requiredString(process.env.CONTACT_EMAIL_FROM, 255);
  const expectedProjectId = requiredString(
    process.env.VITE_FIREBASE_PROJECT_ID,
    255,
  );
  const firebaseProjectMatches =
    !account || !expectedProjectId || account.projectId === expectedProjectId;
  const firebaseAdmin =
    Boolean(account || applicationDefaultCredentials) && firebaseProjectMatches;
  const transport = transportConfiguration(
    firebaseAdmin,
    smtpHost,
    smtpUser,
    smtpPass,
    from,
  );
  if (!transport) {
    console.error('Password reset configuration is incomplete.', {
      firebaseAdmin,
      firebaseProjectMatches,
      smtpHost: Boolean(smtpHost),
      smtpUser: Boolean(smtpUser),
      smtpPassword: Boolean(smtpPass),
      sender: Boolean(from),
    });
    response
      .status(503)
      .json({ error: 'Password reset is currently unavailable.' });
    return;
  }

  try {
    const projectId =
      account?.projectId ??
      requiredString(process.env.FIREBASE_ADMIN_PROJECT_ID, 255) ??
      expectedProjectId;
    const app =
      getApps()[0] ??
      initializeApp({
        credential: account ? cert(account) : applicationDefault(),
        ...(projectId ? { projectId } : {}),
      });
    const firebaseLink = localizedFirebaseLink(
      await getAuth(app).generatePasswordResetLink(email),
      locale,
    );
    const transporter = nodemailer.createTransport({
      host: transport.smtpHost,
      port: Number(process.env.CONTACT_SMTP_PORT ?? '587'),
      secure: process.env.CONTACT_SMTP_SECURE === 'true',
      auth: { user: transport.smtpUser, pass: transport.smtpPass },
    });
    const copy = passwordResetEmailCopy[locale] ?? passwordResetEmailCopy.en;
    const delivery = await transporter.sendMail({
      from: transport.from,
      to: email,
      subject: copy.subject,
      text: `${copy.heading}\n\n${copy.action}: ${firebaseLink}\n\n${copy.ignore}`,
      html: `<h1>${copy.heading}</h1><p><a href="${firebaseLink.replaceAll('&', '&amp;')}">${copy.action}</a></p><p>${copy.ignore}</p>`,
    });
    console.info('Password reset email accepted by SMTP.', {
      locale,
      messageId: delivery.messageId,
    });
  } catch (error) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : '';
    if (code !== 'auth/user-not-found') {
      console.error('Failed to deliver password reset email.', { code });
    }
  }

  // Always return the same response to prevent account enumeration.
  response.status(200).json({ ok: true });
}
