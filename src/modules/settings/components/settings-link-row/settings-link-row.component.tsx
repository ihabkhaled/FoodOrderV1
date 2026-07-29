import { ChevronRight, type LucideIcon } from '@/packages/icons';
import { Link } from '@/packages/router';

interface SettingsLinkRowProps {
  to: string;
  icon: LucideIcon;
  title: string;
  hint: string;
}

export function SettingsLinkRow({
  to,
  icon: Icon,
  title,
  hint,
}: SettingsLinkRowProps) {
  return (
    <Link to={to} className="settings-link-row">
      <span className="settings-link-icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="settings-link-text">
        <strong>{title}</strong>
        <span className="muted">{hint}</span>
      </span>
      <ChevronRight className="settings-link-chevron" aria-hidden="true" />
    </Link>
  );
}
