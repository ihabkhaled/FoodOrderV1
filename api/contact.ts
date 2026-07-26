import nodemailer from 'nodemailer';

import type { ContactRequest, ContactResponse } from './contact.interfaces';

const rateLimitHits = new Map<string, number[]>();
const MAX_BODY_BYTES = 16_384;

const isEnabled = (): boolean => process.env.CONTACT_EMAIL_ENABLED === 'true';

const rateLimitExceeded = (ip: string): boolean => {
  const max = Number(process.env.CONTACT_RATE_LIMIT_MAX ?? '3');
  const windowMs = Number(process.env.CONTACT_RATE_LIMIT_WINDOW_MS ?? '3600000');
  const now = Date.now();
  const hits = (rateLimitHits.get(ip) ?? []).filter((time) => now - time < windowMs);
  if (hits.length >= max) {
    rateLimitHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  rateLimitHits.set(ip, hits);
  return false;
};

const requiredString = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
};

const isValidEmail = (value: string): boolean => {
  if (value.includes(' ') || value.length > 200) return false;
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const [localPart, domain] = parts;
  return Boolean(localPart && domain.includes('.') && !domain.startsWith('.'));
};

export default async function handler(request: ContactRequest, response: ContactResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  if (!isEnabled()) {
    response.status(503).json({ error: 'Contact form is currently unavailable.' });
    return;
  }

  const contentLength = Number(request.headers['content-length'] ?? '0');
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    response.status(413).json({ error: 'Request is too large.' });
    return;
  }

  const ip =
    (request.headers['x-forwarded-for'] as string | undefined)
      ?.split(',', 1)[0]
      ?.trim() ??
    request.socket.remoteAddress ??
    'unknown';
  if (rateLimitExceeded(ip)) {
    response.status(429).json({ error: 'Too many messages sent. Please try again later.' });
    return;
  }

  const body: Record<string, unknown> =
    typeof request.body === 'object' && request.body
      ? (request.body as Record<string, unknown>)
      : {};
  const name = requiredString(body.name, 120);
  const email = requiredString(body.email, 200);
  const message = requiredString(body.message, 5000);
  const website = typeof body.website === 'string' ? body.website.trim() : '';

  if (website) {
    response.status(200).json({ ok: true });
    return;
  }

  if (!name || !email || !message || !isValidEmail(email)) {
    response.status(400).json({ error: 'Please provide a valid name, email, and message.' });
    return;
  }

  try {
    const smtpHost = requiredString(process.env.CONTACT_SMTP_HOST, 255);
    const smtpUser = requiredString(process.env.CONTACT_SMTP_USER, 255);
    const smtpPass = requiredString(process.env.CONTACT_SMTP_PASS, 1000);
    const from = requiredString(process.env.CONTACT_EMAIL_FROM, 255);
    const to = requiredString(process.env.CONTACT_EMAIL_TO, 255);
    if (!smtpHost || !smtpUser || !smtpPass || !from || !to) {
      response.status(503).json({ error: 'Contact form is currently unavailable.' });
      return;
    }
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.CONTACT_SMTP_PORT ?? '587'),
      secure: process.env.CONTACT_SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from,
      to,
      replyTo: email,
      subject: `New contact form message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });

    response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Failed to send contact email.', error);
    response.status(500).json({ error: 'The message could not be sent. Please try again later.' });
  }
}
