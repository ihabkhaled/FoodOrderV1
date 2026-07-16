import { LoaderCircle } from '@/packages/icons';

export function Loading({ label }: { label: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
