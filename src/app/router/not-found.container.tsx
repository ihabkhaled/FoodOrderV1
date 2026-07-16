import { useApp } from '@/modules/session';
import { Link } from '@/packages/router';

import { HOME_PATH } from './app-route-paths.constants';

/** Catch-all route rendered for unknown paths. */
export function NotFoundContainer() {
  const { t } = useApp();
  return (
    <main className="not-found">
      <span>404</span>
      <h1>{t('notFoundTitle')}</h1>
      <p>{t('notFoundBody')}</p>
      <Link className="button" to={HOME_PATH}>
        {t('returnHome')}
      </Link>
    </main>
  );
}
