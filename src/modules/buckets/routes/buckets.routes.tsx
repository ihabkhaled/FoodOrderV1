import type { AppRouteDescriptor } from '@/shared/types';

import { BucketEditorContainer } from '../containers/bucket-editor.container';
import { BucketsContainer } from '../containers/buckets.container';

/**
 * Route descriptors the app shell mounts under the protected app layout.
 * Paths are relative segments; absolute targets live in
 * `buckets-route-paths.constants.ts`.
 */
export const bucketsRoutes: AppRouteDescriptor[] = [
  { path: 'buckets', element: <BucketsContainer /> },
  { path: 'buckets/new', element: <BucketEditorContainer /> },
  { path: 'buckets/:bucketId/edit', element: <BucketEditorContainer /> },
];
