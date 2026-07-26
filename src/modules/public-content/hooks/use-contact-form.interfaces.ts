import type { SyntheticEvent } from 'react';

export interface ContactFormViewModel {
  readonly busy: boolean;
  readonly sent: boolean;
  readonly failed: boolean;
  readonly submit: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>;
}
