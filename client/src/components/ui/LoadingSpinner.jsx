import React from 'react';
import { Loader2 } from 'lucide-react';

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

const variantMap = {
  primary: 'text-indigo-600 dark:text-indigo-400',
  white: 'text-white',
  slate: 'text-slate-500 dark:text-slate-400',
  emerald: 'text-emerald-500'
};

export const LoadingSpinner = ({
  size = 'md',
  variant = 'primary',
  className = '',
  label = null
}) => {
  const sizeClass = sizeMap[size] || sizeMap.md;
  const variantClass = variantMap[variant] || variantMap.primary;

  return (
    <div className={`inline-flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClass} ${variantClass}`} />
      {label && (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      )}
    </div>
  );
};

export const LoadingOverlay = ({ message = 'Loading...', fullScreen = false, className = '' }) => {
  const containerClass = fullScreen
    ? 'fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm'
    : 'absolute inset-0 z-10 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs rounded-2xl';

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${containerClass} ${className}`}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="lg" variant="primary" />
      {message && (
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
