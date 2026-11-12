import { forwardRef, isValidElement } from 'react';
import { Loader2 } from 'lucide-react';

const renderButtonIcon = (IconOrElement) => {
  if (!IconOrElement) return null;
  if (isValidElement(IconOrElement)) return IconOrElement;
  const IconComponent = IconOrElement;
  return <IconComponent className="w-4 h-4 shrink-0 text-current" />;
};

const variantClasses = {
  primary:
    'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 border border-transparent focus:ring-indigo-500',
  secondary:
    'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/80 dark:bg-slate-800 dark:hover:bg-slate-750 dark:border-slate-700 focus:ring-slate-400',
  outline:
    'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800/80 focus:ring-indigo-500',
  ghost:
    'bg-transparent hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800/60 border border-transparent focus:ring-slate-400',
  danger:
    'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 border border-transparent focus:ring-rose-500',
  success:
    'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 border border-transparent focus:ring-emerald-500'
};

const sizeClasses = {
  xs: 'px-2.5 py-1 text-xs gap-1.5 rounded-md font-medium',
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg font-semibold',
  md: 'px-4 py-2 text-xs sm:text-sm gap-2 rounded-xl font-semibold',
  lg: 'px-5 py-2.5 text-sm sm:text-base gap-2.5 rounded-xl font-bold'
};

export const Button = forwardRef(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      disabled = false,
      fullWidth = false,
      type = 'button',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
          variantClasses[variant] || variantClasses.primary
        } ${sizeClasses[size] || sizeClasses.md} ${
          fullWidth ? 'w-full' : ''
        } ${isDisabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'active:scale-[0.98]'} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {renderButtonIcon(LeftIcon)}
            {children}
            {renderButtonIcon(RightIcon)}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
