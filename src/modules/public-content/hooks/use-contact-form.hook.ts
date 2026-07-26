import { type SyntheticEvent, useState } from 'react';

import { submitContactForm } from '@/platform/network';

import type { ContactFormViewModel } from './use-contact-form.interfaces';

export const useContactForm = (): ContactFormViewModel => {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async (
    event: SyntheticEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setSent(false);
    setFailed(false);
    try {
      await submitContactForm(form);
      setSent(true);
      form.reset();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return { busy, sent, failed, submit };
};
