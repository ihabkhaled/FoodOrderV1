import { useLocation } from '@/packages/router';

import { buildPublicContentViewModel } from '../helpers/build-public-content-view-model.helper';

export const usePublicContent = () => {
  const location = useLocation();
  return buildPublicContentViewModel(location.pathname);
};
