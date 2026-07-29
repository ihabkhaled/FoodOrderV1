import { type RefObject, useEffect, useRef, useState } from 'react';

export interface DangerReauthDialogState {
  dialogRef: RefObject<HTMLDialogElement | null>;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
}

/**
 * Owns the `<dialog>` lifecycle plus the credential draft, which resets every
 * time the dialog opens so stale secrets never linger between attempts.
 */
export const useDangerReauthDialog = (
  open: boolean,
): DangerReauthDialogState => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (open) {
      setEmail('');
      setPassword('');
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  return { dialogRef, email, setEmail, password, setPassword };
};
