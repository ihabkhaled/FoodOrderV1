import { useEffect, useRef, useState } from 'react';

const formatNumericValue = (value: number): string =>
  value === 0 ? '' : String(value);

const clampNumericValue = (
  value: number,
  min: number,
  max: number | undefined,
): number => {
  const floored = Math.max(min, value);
  return max === undefined ? floored : Math.min(max, floored);
};

export interface NumericFieldViewModel {
  draft: string;
  handleChange: (raw: string) => void;
  handleBlur: () => void;
}

/**
 * Holds the text the user is typing separately from the numeric value so a
 * zero value renders as an empty field (placeholder shows the zero) and
 * partial entries like "1." survive re-renders.
 */
export function useNumericField(
  value: number,
  onValueChange: (next: number) => void,
  min: number,
  max: number | undefined,
): NumericFieldViewModel {
  const [draft, setDraft] = useState(() => formatNumericValue(value));
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setDraft(formatNumericValue(value));
    }
  }, [value]);

  const emit = (next: number): void => {
    lastEmitted.current = next;
    onValueChange(next);
  };

  const handleChange = (raw: string): void => {
    if (raw === '') {
      setDraft('');
      emit(0);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const clamped = clampNumericValue(parsed, min, max);
    setDraft(clamped === parsed ? raw : String(clamped));
    emit(clamped);
  };

  const handleBlur = (): void => {
    setDraft(formatNumericValue(lastEmitted.current));
  };

  return { draft, handleChange, handleBlur };
}
