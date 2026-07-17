import { BackLinkView } from './back-link.component';
import { useBackLink } from './use-back-link.hook';

interface BackLinkProps {
  readonly fallback: string;
  readonly label: string;
}

export function BackLink({ fallback, label }: BackLinkProps) {
  const destination = useBackLink(fallback);
  return <BackLinkView destination={destination} label={label} />;
}
