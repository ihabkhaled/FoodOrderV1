import { ArrowLeft } from '@/packages/icons';
import { Link } from '@/packages/router';

interface BackLinkViewProps {
  readonly destination: string;
  readonly label: string;
}

export function BackLinkView({ destination, label }: BackLinkViewProps) {
  return (
    <Link className="back-link" to={destination}>
      <ArrowLeft aria-hidden="true" />
      {label}
    </Link>
  );
}
