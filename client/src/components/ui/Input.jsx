import { forwardRef, isValidElement, useId } from 'react';

const renderIcon = (IconOrElement) => {
  if (!IconOrElement) return null;
  if (isValidElement(IconOrElement)) return IconOrElement;
  const IconComponent = IconOrElement;
  return <IconComponent className="w-4 h-4" />;
};

export const Input = forwardRef(
  (
    {
      label,
      helperText,
      error,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      required = false,
      disabled = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative rounded-xl shadow-sm">
          {LeftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {renderIcon(LeftIcon)}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full text-xs sm:text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 py-2.5 ${
              LeftIcon ? 'pl-10' : 'pl-3.5'
            } ${RightIcon ? 'pr-10' : 'pr-3.5'} ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
            } ${disabled ? 'bg-slate-100 dark:bg-slate-900 opacity-60 cursor-not-allowed' : ''} ${className}`}
            {...props}
          />

          {RightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {renderIcon(RightIcon)}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-[11px] text-rose-500 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
