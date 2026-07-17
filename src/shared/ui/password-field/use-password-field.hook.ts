import { useCallback, useState } from 'react';

export interface PasswordFieldState {
  visible: boolean;
  toggle: () => void;
}

/** Owns the show/hide state of a single password input. */
export const usePasswordField = (): PasswordFieldState => {
  const [visible, setVisible] = useState(false);
  const toggle = useCallback(() => {
    setVisible((current) => !current);
  }, []);
  return { visible, toggle };
};
