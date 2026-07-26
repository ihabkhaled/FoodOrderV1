import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ContactRequest extends IncomingMessage {
  body?: unknown;
  method?: string;
}

export interface ContactResponse extends ServerResponse {
  status: (statusCode: number) => ContactResponse;
  json: (body: unknown) => void;
}
