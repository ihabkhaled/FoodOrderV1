import type { SocialMessageKey } from '../../i18n/social-messages.constants';

interface SocialHeroProps {
  s: (key: SocialMessageKey) => string;
  friendCount: number;
  activeGroupCount: number;
  pendingCount: number;
}

export function SocialHero({
  s,
  friendCount,
  activeGroupCount,
  pendingCount,
}: SocialHeroProps) {
  return (
    <section className="section-card social-hero">
      <div className="stack">
        <div>
          <p className="eyebrow">{s('social')}</p>
          <h1>{s('social')}</h1>
        </div>
        <p className="muted">{s('socialIntro')}</p>
      </div>
      <div className="social-summary">
        <div className="social-summary-card">
          <strong>{friendCount}</strong>
          <span>{s('friends')}</span>
        </div>
        <div className="social-summary-card">
          <strong>{activeGroupCount}</strong>
          <span>{s('groups')}</span>
        </div>
        <div className="social-summary-card">
          <strong>{pendingCount}</strong>
          <span>{s('pending')}</span>
        </div>
      </div>
    </section>
  );
}
