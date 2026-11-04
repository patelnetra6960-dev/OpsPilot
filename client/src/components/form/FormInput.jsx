import React from 'react';
import FormField from './FormField.jsx';

export const FormInput = ({
  id,
  name,
  label,
  register,
  error,
  helperText,
  required = false,
  type = 'text',
  placeholder,
  disabled = false,
  icon: Icon,
  className = '',
  inputClassName = '',
  ...rest
}) => {
  const inputId = id || name;
  const registration = register ? register(name) : {};
  const hasError = Boolean(error);

  return (
    <FormField
      id={inputId}
      label={label}
      required={required}
      error={error}
      helperText={helperText}
      className={className}
    >
      <div className="relative rounded-xl">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          name={name}
          type={type}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={
            hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          className={`w-full rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            Icon ? 'pl-10 pr-3.5' : 'px-3.5'
          } py-2.5 ${
            hasError
              ? 'border-rose-500 bg-rose-50/20 text-slate-900 dark:text-slate-100 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20'
          } ${inputClassName}`}
          {...registration}
          {...rest}
        />
      </div>
    </FormField>
  );
};

export default FormInput;
