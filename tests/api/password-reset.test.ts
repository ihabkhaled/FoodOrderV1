import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SUPPORTED_LOCALES } from '@/shared/i18n';

import type {
  PasswordResetRequest,
  PasswordResetResponse,
} from '../../api/password-reset.interfaces';
import passwordResetEmailCopy from '../../api/password-reset.locales.json';
const mocks = vi.hoisted(() => ({
  generatePasswordResetLink: vi.fn(),
  sendMail: vi.fn<
    (message: {
      to: string;
      subject: string;
      text: string;
    }) => Promise<{ messageId: string }>
  >(),
}));

vi.mock('firebase-admin/app', () => ({
  applicationDefault: vi.fn(() => ({ projectId: 'food-order-test' })),
  cert: vi.fn(() => ({ projectId: 'food-order-test' })),
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => ({ name: 'password-reset-test' })),
}));
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    generatePasswordResetLink: mocks.generatePasswordResetLink,
  })),
}));
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mocks.sendMail })),
  },
}));

import passwordResetHandler from '../../api/password-reset';

const invoke = async (body: Record<string, unknown>) => {
  const request = {
    method: 'POST',
    body,
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
  } as PasswordResetRequest;
  let statusCode = 200;
  let responseBody: unknown;
  const response = {} as PasswordResetResponse;
  response.status = (code: number) => {
    statusCode = code;
    return response;
  };
  response.json = (value: unknown) => {
    responseBody = value;
  };
  await passwordResetHandler(request, response);
  return { statusCode, responseBody };
};

describe('password-reset email endpoint', () => {
  beforeEach(() => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      project_id: 'food-order-test',
      client_email: 'firebase-admin@example.test',
      private_key: String.raw`-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----`,
    });
    process.env.CONTACT_SMTP_HOST = 'smtp.example.test';
    process.env.CONTACT_SMTP_USER = 'smtp-user';
    process.env.CONTACT_SMTP_PASS = 'smtp-pass';
    process.env.CONTACT_EMAIL_FROM = 'FoodOrder <support@example.test>';
    process.env.CONTACT_RATE_LIMIT_MAX = '100';
    process.env.VITE_FIREBASE_PROJECT_ID = 'food-order-test';
    mocks.generatePasswordResetLink.mockResolvedValue(
      'https://food-order-test.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=test',
    );
    mocks.sendMail.mockResolvedValue({ messageId: 'message-id' });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.CONTACT_SMTP_HOST;
    delete process.env.CONTACT_SMTP_USER;
    delete process.env.CONTACT_SMTP_PASS;
    delete process.env.CONTACT_EMAIL_FROM;
    delete process.env.CONTACT_RATE_LIMIT_MAX;
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    delete process.env.VITE_FIREBASE_PROJECT_ID;
  });

  it('has email copy for every supported application locale', () => {
    expect(new Set(Object.keys(passwordResetEmailCopy))).toEqual(
      new Set(SUPPORTED_LOCALES),
    );
  });

  it('generates the action code but delivers localized email over SMTP', async () => {
    const result = await invoke({
      email: 'User@Example.com',
      locale: 'ar',
    });

    expect(result).toEqual({ statusCode: 200, responseBody: { ok: true } });
    expect(mocks.generatePasswordResetLink).toHaveBeenCalledWith(
      'user@example.com',
    );
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'إعادة تعيين كلمة مرور FoodOrder',
      }),
    );
    expect(mocks.sendMail.mock.calls[0]?.[0].text).toContain('lang=ar');
  });

  it('does not disclose that an account is missing', async () => {
    mocks.generatePasswordResetLink.mockRejectedValue({
      code: 'auth/user-not-found',
    });

    await expect(
      invoke({ email: 'missing@example.com', locale: 'en' }),
    ).resolves.toEqual({ statusCode: 200, responseBody: { ok: true } });
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it('accepts the repository service-account variable name', async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT =
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    await expect(
      invoke({ email: 'user@example.com', locale: 'fr' }),
    ).resolves.toEqual({ statusCode: 200, responseBody: { ok: true } });
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Réinitialisez votre mot de passe FoodOrder',
      }),
    );
  });

  it('reports unavailable before attempting delivery without Admin credentials', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    await expect(
      invoke({ email: 'user@example.com', locale: 'en' }),
    ).resolves.toEqual({
      statusCode: 503,
      responseBody: { error: 'Password reset is currently unavailable.' },
    });
    expect(mocks.generatePasswordResetLink).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it('rejects a service account for a different Firebase project', async () => {
    process.env.VITE_FIREBASE_PROJECT_ID = 'another-project';

    await expect(
      invoke({ email: 'user@example.com', locale: 'en' }),
    ).resolves.toEqual({
      statusCode: 503,
      responseBody: { error: 'Password reset is currently unavailable.' },
    });
    expect(mocks.generatePasswordResetLink).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});
