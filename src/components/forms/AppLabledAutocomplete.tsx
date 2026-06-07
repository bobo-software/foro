import React, { useState, useEffect, useRef } from 'react';
import { LuX } from 'react-icons/lu';

interface AppAutocompleteProps<T extends object> {
  label: string;
  options: T[];
  onSelect: (item: T) => void;
  onClear?: () => void;
  value?: string;
  displayValue?: string;
  accessor?: string;
  valueAccessor?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
  onChange?: (displayValue: string) => void;
}

function AppLabledAutocomplete<T extends object>({
  label,
  options,
  onSelect,
  onClear,
  value = '',
  displayValue = '',
  accessor = 'name',
  valueAccessor = 'id',
  required = false,
  disabled = false,
  error,
  className = '',
  placeholder,
  onChange,
}: AppAutocompleteProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<T[]>(options);
  const [, setSelectedOption] = useState<T | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputId = label.toLowerCase().replace(/\s+/g, '-');

  const getField = (item: T, key: string): unknown => (item as Record<string, unknown>)[key];

  useEffect(() => {
    if (displayValue) {
      setSearchText(displayValue);
    } else {
      setSearchText('');
    }
  }, [displayValue]);

  useEffect(() => {
    if (value) {
      const option = options.find(
        (opt) => String(getField(opt, valueAccessor)) === String(value),
      );
      setSelectedOption(option ?? null);
    } else {
      setSelectedOption(null);
    }
  }, [value, options, valueAccessor]);

  useEffect(() => {
    if (!searchText) {
      setFilteredOptions(options);
      return;
    }

    const filtered = options.filter((option) => {
      const optionValue = getField(option, accessor);
      return optionValue && String(optionValue).toLowerCase().includes(searchText.toLowerCase());
    });
    setFilteredOptions(filtered);
  }, [searchText, options, accessor]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOptionSelect = (item: T) => {
    setSelectedOption(item);
    setSearchText(String(getField(item, accessor)));
    setIsOpen(false);
    onSelect(item);
    onChange?.(String(getField(item, accessor)));
  };

  const handleClear = () => {
    setSearchText('');
    setSelectedOption(null);
    setIsOpen(false);
    onClear?.();
    onChange?.('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchText(newValue);
    onChange?.(newValue);
    setIsOpen(true);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={wrapperRef}>
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <div className={`
          flex items-center
          w-full px-3 py-1.5
          bg-white dark:bg-slate-800 border rounded-lg
          text-slate-700 dark:text-slate-100 text-sm
          focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500
          dark:focus-within:ring-indigo-400 dark:focus-within:border-indigo-400
          disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'}
          ${disabled ? 'cursor-not-allowed' : ''}
        `}>
          <input
            id={inputId}
            type="text"
            value={searchText}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder || label}
            disabled={disabled}
            autoComplete="off"
            className="w-full outline-none bg-transparent"
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
          {searchText && (
            <button
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              type="button"
            >
              {React.createElement(LuX as React.ComponentType<{ size?: number }>, { size: 16 })}
            </button>
          )}
        </div>

        {isOpen && filteredOptions.length > 0 && (
          <div className="absolute z-[500] w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredOptions.map((item, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(item)}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 focus:bg-slate-50 dark:focus:bg-slate-700 focus:outline-none"
                type="button"
              >
                {String(getField(item, accessor))}
              </button>
            ))}
          </div>
        )}
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
}

export default AppLabledAutocomplete;
