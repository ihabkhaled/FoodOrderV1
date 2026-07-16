import { AlertTriangle } from '@/packages/icons';
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <section className="error-state" role="alert"><AlertTriangle /><p>{message}</p>{onRetry ? <button className="button secondary" onClick={onRetry}>Try again</button> : null}</section>;
}
