import { ChevronRight, type LucideIcon } from '@/packages/icons';
import { Link } from '@/packages/router';

export interface LinkRowProps {
  to: string;
  icon: LucideIcon;
  title: string;
  hint: string;
}

/**
 * One tappable row in a hub page's navigation list: icon, title, one-line
 * hint, and a direction-aware chevron. Wrap a group of them in an element
 * with the `link-rows` class.
 */
export function LinkRow({ to, icon: Icon, title, hint }: LinkRowProps) {
  return (
    <Link to={to} className="link-row">
      <span className="link-row-icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="link-row-text">
        <strong>{title}</strong>
        <span className="muted">{hint}</span>
      </span>
      <ChevronRight className="link-row-chevron" aria-hidden="true" />
    </Link>
  );
}
