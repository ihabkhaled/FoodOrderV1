import { ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface BackLinkProps {
  readonly fallback: string;
  readonly label: string;
}

interface NavigationState {
  readonly from?: unknown;
}

const isSafeInternalPath = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');

export function BackLink({ fallback, label }: BackLinkProps) {
  const location = useLocation();
  const state = location.state as NavigationState | null;
  const origin = state?.from;
  const destination =
    isSafeInternalPath(origin) && origin !== location.pathname ? origin : fallback;

  return (
    <Link className="back-link" to={destination}>
      <ArrowLeft aria-hidden="true" />
      {label}
    </Link>
  );
}
