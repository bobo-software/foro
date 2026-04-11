import React from 'react';
import { LuUser, LuCheck } from 'react-icons/lu';
import AppLabledAutocomplete from './AppLabledAutocomplete';
import { AppButton } from '@components/ComponentsIndex';

export interface ProfileField {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  showSaveButton?: boolean;
  field: string;
  required: boolean;
  type?: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'autocomplete' | 'time' | 'tel';
  options?: string[] | any[];
  accessor?: string;
  valueAccessor?: string;
  displayValue?: string;
  onSelect?: (item: any) => void;
  onClear?: () => void;
  onChange?: (value: string) => void;
}

interface AppProfileDetailsProps {
  title?: string;
  icon?: React.ReactNode;
  showSaveButton?: boolean;
  fields: ProfileField[];
  formData: Record<string, string>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSave: () => void;
  onCancel?: () => void;
  isEditing?: boolean;
  setIsEditing?: (isEditing: boolean) => void;
  showEditButton?: boolean;
  className?: string;
}

const AppProfileDetails: React.FC<AppProfileDetailsProps> = ({
  title = 'Profile Information',
  icon = React.createElement(LuUser as React.ComponentType<{ className?: string; size?: number }>, { className: 'text-blue-600', size: 20 }),
  fields,
  formData,
  onInputChange,
  onSave,
  showSaveButton = true,
  isEditing = true,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            {icon}
          </div>
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        </div>
        {showSaveButton && (
          <AppButton
            label="Save Changes"
            onClick={onSave}
            icon={React.createElement(LuCheck as React.ComponentType<{ size?: number }>, { size: 16 })}
            variant="blue"
          />
        )}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="p-2 bg-slate-50 rounded-lg mt-1">
                {field.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </p>
                {isEditing ? (
                  field.type === 'autocomplete' ? (
                    <AppLabledAutocomplete
                      label=""
                      options={field.options || []}
                      onSelect={field.onSelect || (() => { })}
                      onClear={field.onClear}
                      value={formData[field.field] || ''}
                      displayValue={field.displayValue}
                      accessor={field.accessor || 'name'}
                      valueAccessor={field.valueAccessor || 'id'}
                      required={field.required}
                      className="mt-1"
                      onChange={field.onChange}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      name={field.field}
                      value={formData[field.field] || ''}
                      onChange={onInputChange}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      name={field.field}
                      value={formData[field.field] || ''}
                      onChange={onInputChange}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      rows={3}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : field.type === 'number' ? (
                    <input
                      type="number"
                      name={field.field}
                      value={formData[field.field] || ''}
                      onChange={onInputChange}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : field.type === 'date' ? (
                    <input
                      type="date"
                      name={field.field}
                      value={formData[field.field] || ''}
                      onChange={onInputChange}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : field.type === 'time' ? (
                    <input
                      type="time"
                      name={field.field}
                      value={formData[field.field] || ''}
                      onChange={onInputChange}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : field.type === 'tel' ? (
                    <input
                      type="tel"
                      name={field.field}
                      value={formData[field.field] || ''}
                      onChange={onInputChange}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <input
                      type="text"
                      name={field.field}
                      value={formData[field.field] || ''}
                      onChange={onInputChange}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )
                ) : (
                  <p className="text-base text-slate-800 mt-1">{field.value || 'N/A'}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppProfileDetails; 