import React from 'react';
import { LuChevronDown } from 'react-icons/lu';

type SelectOption = string | { value: string; label: string };

interface AppSelectInputProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  label: string;
  id?: string;
  labelHidden?: boolean;
  options: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
  name?: string;
}

function optionValue(o: SelectOption): string {
  return typeof o === 'string' ? o : o.value;
}

function optionLabel(o: SelectOption): string {
  return typeof o === 'string' ? o : o.label;
}

const AppLabeledSelectInput: React.FC<AppSelectInputProps> = ({
  label,
  id,
  labelHidden = false,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  error,
  className = '',
  placeholder = 'Select an option'
}) => {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={inputId}
        className={`text-sm font-medium text-slate-700 dark:text-slate-300${labelHidden ? ' sr-only' : ''}`}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <select
          id={inputId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`
            w-full px-3 py-1.5
            bg-white dark:bg-slate-800 border rounded-lg
            text-slate-700 dark:text-slate-100 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            dark:focus:ring-indigo-400 dark:focus:border-indigo-400
            disabled:bg-slate-50 dark:disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
            appearance-none
            ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'}
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option, index) => (
            <option
              key={index}
              value={optionValue(option)}
              className="text-slate-700"
            >
              {optionLabel(option)}
            </option>
          ))}
        </select>

        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          {React.createElement(LuChevronDown as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4 text-slate-400' })}
        </div>
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          className="text-sm text-red-500 mt-1"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default AppLabeledSelectInput;
