const variantStyles = {
  brand:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/80',
  neutral:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  success:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80',
  warning:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80',
  danger:
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80',
  info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/80'
};

const dotColors = {
  brand: 'bg-indigo-500',
  neutral: 'bg-slate-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500'
};

export const Badge = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulseDot = false,
  className = '',
  children
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-0.5 text-xs gap-1.5'
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border transition-colors select-none ${
        variantStyles[variant] || variantStyles.neutral
      } ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulseDot && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                dotColors[variant] || dotColors.neutral
              }`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
              dotColors[variant] || dotColors.neutral
            }`}
          />
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;
