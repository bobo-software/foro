import type { RefObject } from 'react';
import type { CreateAddressDto } from '@/types/address';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { SA_PROVINCES } from '@/constants/saProvinces';

interface CompanyAddressFieldsProps {
  addressLookup: string;
  onAddressLookupChange: (value: string) => void;
  addressLookupRef: RefObject<HTMLInputElement | null>;
  mapsStatus: 'idle' | 'ready' | 'failed';
  addressForm: Partial<CreateAddressDto>;
  onAddressFieldChange: (key: keyof CreateAddressDto, value: string) => void;
  disabled: boolean;
}

export function CompanyAddressFields({
  addressLookup,
  onAddressLookupChange,
  addressLookupRef,
  mapsStatus,
  addressForm,
  onAddressFieldChange,
  disabled,
}: CompanyAddressFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="address_lookup" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Address lookup
        </label>
        <input
          id="address_lookup"
          ref={addressLookupRef}
          type="text"
          value={addressLookup}
          onChange={(e) => onAddressLookupChange(e.target.value)}
          disabled={disabled}
          placeholder="Search address with Google Places"
          className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 transition-colors duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {mapsStatus === 'ready' && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Select a suggestion to auto-fill the address.
          </p>
        )}
        {mapsStatus === 'failed' && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Google Places unavailable. Enter address manually below.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <AppInputLabeled
            label="Street address"
            type="text"
            value={addressForm.street_address ?? ''}
            onChange={(e) => onAddressFieldChange('street_address', e.target.value)}
            disabled={disabled}
            placeholder="123 Main Street"
          />
        </div>
        <AppInputLabeled
          label="Suburb"
          type="text"
          value={addressForm.suburb ?? ''}
          onChange={(e) => onAddressFieldChange('suburb', e.target.value)}
          disabled={disabled}
        />
        <AppInputLabeled
          label="City"
          type="text"
          value={addressForm.city ?? ''}
          onChange={(e) => onAddressFieldChange('city', e.target.value)}
          disabled={disabled}
        />
        <AppLabeledSelectInput
          label="Province"
          value={addressForm.province ?? ''}
          onChange={(e) => onAddressFieldChange('province', e.target.value)}
          disabled={disabled}
          options={SA_PROVINCES}
        />
        <AppInputLabeled
          label="Postal code"
          type="text"
          value={addressForm.postal_code ?? ''}
          onChange={(e) => onAddressFieldChange('postal_code', e.target.value)}
          disabled={disabled}
          placeholder="0001"
        />
      </div>
    </div>
  );
}
