import type { LucideIcon } from '@/packages/icons';
import { Link } from '@/packages/router';

export interface DashboardStatCard {
  label: string;
  value: number;
  icon: LucideIcon;
  to: string;
}

interface DashboardStatGridProps {
  cards: DashboardStatCard[];
  ariaLabel: string;
}

export function DashboardStatGrid({ cards, ariaLabel }: DashboardStatGridProps) {
  return (
    <section className="stat-grid" aria-label={ariaLabel}>
      {cards.map(({ label, value, icon: Icon, to }) => (
        <Link className="stat-card stat-card-link" key={label} to={to}>
          <Icon />
          <div>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        </Link>
      ))}
    </section>
  );
}
