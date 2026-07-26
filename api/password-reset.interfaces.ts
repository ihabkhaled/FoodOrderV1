import type { IncomingMessage, ServerResponse } from 'node:http';

export interface PasswordResetRequest extends IncomingMessage {
  body?: unknown;
  method?: string;
}

export interface PasswordResetResponse extends ServerResponse {
  status: (statusCode: number) => PasswordResetResponse;
  json: (body: unknown) => void;
}

export interface FirebaseServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface PasswordResetTransportConfiguration {
  smtpHost: string;
  smtpUser: string;
  smtpPass: string;
  from: string;
}

export interface PasswordResetEmailCopy {
  subject: string;
  heading: string;
  action: string;
  ignore: string;
}

export interface PasswordResetEmailCatalog {
  en: PasswordResetEmailCopy;
  [locale: string]: PasswordResetEmailCopy | undefined;
}
