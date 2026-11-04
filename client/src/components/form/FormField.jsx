import React from 'react';
import { AlertCircle } from 'lucide-react';

export const FormField = ({
  id,
  label,
  required = false,
  error,
  helperText,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <p
          id={id ? `${id}-error` : undefined}
          className="text-xs text-rose-500 flex items-center gap-1 font-medium animate-in fade-in-0 duration-150"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{typeof error === 'string' ? error : error?.message}</span>
        </p>
      ) : helperText ? (
        <p
          id={id ? `${id}-helper` : undefined}
          className="text-[11px] text-slate-500 dark:text-slate-400"
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

export default FormField;
