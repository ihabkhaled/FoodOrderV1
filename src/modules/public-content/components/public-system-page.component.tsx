import type { PublicSystemPageProps } from '../types/public-content.types';

export function PublicSystemPage({
  copy,
  homePath,
  ui,
}: PublicSystemPageProps) {
  return (
    <main id="public-main" className="public-main public-system-page">
      <p className="public-system-page__code" aria-hidden="true">
        ···
      </p>
      <h1>{copy.heading}</h1>
      <p>{copy.body}</p>
      <a className="public-button" href={homePath}>
        {ui.backHomeLabel}
      </a>
    </main>
  );
}
