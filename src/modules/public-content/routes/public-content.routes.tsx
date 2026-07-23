import { Route, Routes } from '@/packages/router';

import { PublicContentContainer } from '../containers/public-content.container';
import type { PublicContentRoutesProps } from '../types/public-content.types';

export function PublicContentRoutes({
  applicationPath,
}: PublicContentRoutesProps) {
  return (
    <Routes>
      <Route path="*" element={<PublicContentContainer applicationPath={applicationPath} />} />
    </Routes>
  );
}
