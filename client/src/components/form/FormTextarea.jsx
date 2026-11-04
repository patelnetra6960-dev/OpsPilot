import React from 'react';
import FormField from './FormField.jsx';

export const FormTextarea = ({
  id,
  name,
  label,
  register,
  error,
  helperText,
  required = false,
  placeholder,
  rows = 4,
  disabled = false,
  className = '',
  textareaClassName = '',
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
      <textarea
        id={inputId}
        name={name}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={
          hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
        }
        className={`w-full rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed px-3.5 py-2.5 ${
          hasError
            ? 'border-rose-500 bg-rose-50/20 text-slate-900 dark:text-slate-100 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20'
        } ${textareaClassName}`}
        {...registration}
        {...rest}
      />
    </FormField>
  );
};

export default FormTextarea;
