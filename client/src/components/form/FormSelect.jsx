import React from 'react';
import FormField from './FormField.jsx';

export const FormSelect = ({
  id,
  name,
  label,
  register,
  error,
  helperText,
  required = false,
  options = [],
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  selectClassName = '',
  children,
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
      <select
        id={inputId}
        name={name}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={
          hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
        }
        className={`w-full rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed px-3.5 py-2.5 ${
          hasError
            ? 'border-rose-500 bg-rose-50/20 text-slate-900 dark:text-slate-100 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-indigo-500/20'
        } ${selectClassName}`}
        {...registration}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled className="text-slate-400">
            {placeholder}
          </option>
        )}
        {children ||
          options.map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const text = typeof opt === 'string' ? opt : opt.label;
            const isOptDisabled = typeof opt === 'object' ? opt.disabled : false;
            return (
              <option key={val} value={val} disabled={isOptDisabled}>
                {text}
              </option>
            );
          })}
      </select>
    </FormField>
  );
};

export default FormSelect;
