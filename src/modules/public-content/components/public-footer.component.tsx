import type { PublicFooterProps } from '../types/public-content.types';

export function PublicFooter({
  brandName,
  homePath,
  items,
  ui,
}: PublicFooterProps) {
  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div>
          <a className="public-brand" href={homePath}>
            <span className="public-brand__mark" aria-hidden="true">
              FO
            </span>
            <span>{brandName}</span>
          </a>
          <p>{ui.footerTagline}</p>
        </div>
        <nav aria-label={ui.footerNavigationLabel}>
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
      <p className="public-footer__legal">
        © 2026 {brandName}. {ui.allRightsReservedLabel}
      </p>
    </footer>
  );
}
