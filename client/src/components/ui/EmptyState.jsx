import { Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button.jsx';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no items to display in this workspace view.',
  actionLabel,
  onAction,
  className = ''
}) => (
  <div
    className={`p-10 sm:p-14 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 flex flex-col items-center justify-center space-y-3 ${className}`}
  >
    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm">
      <Icon className="w-6 h-6" />
    </div>

    <div className="space-y-1 max-w-sm">
      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>

    {actionLabel && onAction && (
      <Button variant="primary" size="sm" onClick={onAction} className="mt-2">
        {actionLabel}
      </Button>
    )}
  </div>
);

export const ErrorState = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this data.',
  onRetry,
  className = ''
}) => (
  <div
    className={`p-8 sm:p-10 text-center rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 flex flex-col items-center justify-center space-y-3 ${className}`}
  >
    <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-500 shadow-sm">
      <AlertCircle className="w-6 h-6" />
    </div>

    <div className="space-y-1 max-w-sm">
      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h4>
      <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">{message}</p>
    </div>

    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry} leftIcon={RefreshCw} className="mt-2">
        Try Again
      </Button>
    )}
  </div>
);

export default EmptyState;
