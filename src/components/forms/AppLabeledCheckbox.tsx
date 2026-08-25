import React from 'react';

interface AppLabeledCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

const AppLabeledCheckbox: React.FC<AppLabeledCheckboxProps> = ({
  checked,
  onChange,
  label,
  id,
  helperText,
  disabled = false,
  className = '',
}) => {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const helperId = helperText ? `${inputId}-help` : undefined;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={inputId}
        className={`flex items-center gap-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={helperId}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className={`text-sm font-medium ${disabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
          {label}
        </span>
      </label>
      {helperText && (
        <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400 ml-6">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default AppLabeledCheckbox;
