import { LoaderCircle } from 'lucide-react';
import { useApp } from '@/state/AppContext';

export function Loading({ label }: { label?: string }) {
  const { t } = useApp();
  return <div className="loading" role="status"><LoaderCircle className="spin" aria-hidden="true" /><span>{label ?? t('loading')}</span></div>;
}
