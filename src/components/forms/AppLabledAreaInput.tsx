import React from 'react'

interface AppLabeledAreaInputProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  label: string;
  labelHidden?: boolean;
  placeholder?: string;
  required?: boolean;
  error?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
  textareaClassName?: string;
}

const AppLabeledAreaInput: React.FC<AppLabeledAreaInputProps> = ({
  label,
  labelHidden = false,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  rows = 4,
  disabled = false,
  className = '',
  textareaClassName = '',
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className={`text-sm font-medium text-slate-700 dark:text-slate-300${labelHidden ? ' sr-only' : ''}`}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        className={`
          w-full px-3 py-1.5 text-sm border rounded-lg
          text-slate-700 dark:text-slate-100
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          dark:focus:ring-indigo-400
          disabled:bg-slate-50 dark:disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
          ${error ? 'border-red-300' : 'border-slate-200 dark:border-slate-600'}
          ${disabled ? 'bg-slate-50 dark:bg-slate-700' : 'bg-white dark:bg-slate-800'}
          resize-none
          ${textareaClassName}
        `}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        disabled={disabled}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${label}-error` : undefined}
      />
      {error && (
        <p className="text-sm text-red-500" id={`${label}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

export default AppLabeledAreaInput
