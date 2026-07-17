import type { ReactElement } from 'react';

/**
 * A single route entry a feature module contributes to the application
 * router. Paths are RELATIVE segments; the app shell decides where the
 * module's routes mount. Absolute navigation targets live in each module's
 * `routes/<module>-route-paths.constants.ts`.
 */
export interface AppRouteDescriptor {
  path?: string;
  index?: boolean;
  element: ReactElement;
}
