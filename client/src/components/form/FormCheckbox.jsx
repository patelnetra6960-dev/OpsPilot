import React from 'react';
import { AlertCircle } from 'lucide-react';

export const FormCheckbox = ({
  id,
  name,
  label,
  description,
  register,
  error,
  disabled = false,
  className = '',
  ...rest
}) => {
  const inputId = id || name;
  const registration = register ? register(name) : {};

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-start gap-3">
        <input
          id={inputId}
          name={name}
          type="checkbox"
          disabled={disabled}
          className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 transition-colors disabled:opacity-50"
          {...registration}
          {...rest}
        />
        <div className="flex-1 text-sm">
          {label && (
            <label
              htmlFor={inputId}
              className="font-medium text-slate-800 dark:text-slate-200 select-none cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {error && (
        <p className="text-xs text-rose-500 flex items-center gap-1 font-medium pl-7">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{typeof error === 'string' ? error : error?.message}</span>
        </p>
      )}
    </div>
  );
};

export default FormCheckbox;
