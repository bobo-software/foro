import AppLabledInput from '@/components/forms/AppLabledInput';
import AppLabledSelectInput from '@/components/forms/AppLabledSelectInput';
import { SA_PROVINCES } from '@/constants/saProvinces';

interface BusinessAddressValues {
  street_address?: string;
  street_address_2?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
}

interface BusinessAddressSectionProps {
  values: BusinessAddressValues;
  onChange: (field: string, value: string) => void;
  idPrefix?: string;
}

export function BusinessAddressSection({ values, onChange, idPrefix = '' }: BusinessAddressSectionProps) {
  const p = idPrefix ? `${idPrefix}-` : '';
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <AppLabledInput
          id={`${p}street_address`}
          label="Street Address"
          type="text"
          value={values.street_address ?? ''}
          onChange={(e) => onChange('street_address', e.target.value)}
          placeholder="123 Main Street"
        />
      </div>
      <div className="sm:col-span-2">
        <AppLabledInput
          id={`${p}street_address_2`}
          label="Street Address 2"
          type="text"
          value={values.street_address_2 ?? ''}
          onChange={(e) => onChange('street_address_2', e.target.value)}
          placeholder="Suite, Unit, Building, Floor, etc."
        />
      </div>
      <AppLabledInput
        id={`${p}suburb`}
        label="Suburb"
        type="text"
        value={values.suburb ?? ''}
        onChange={(e) => onChange('suburb', e.target.value)}
      />
      <AppLabledInput
        id={`${p}city`}
        label="City"
        type="text"
        value={values.city ?? ''}
        onChange={(e) => onChange('city', e.target.value)}
      />
      <AppLabledSelectInput
        id={`${p}province`}
        label="Province"
        value={values.province ?? ''}
        onChange={(e) => onChange('province', e.target.value)}
        options={SA_PROVINCES}
      />
      <AppLabledInput
        id={`${p}postal_code`}
        label="Postal Code"
        type="text"
        value={values.postal_code ?? ''}
        onChange={(e) => onChange('postal_code', e.target.value)}
        placeholder="0001"
      />
      <AppLabledInput
        id={`${p}country`}
        label="Country"
        type="text"
        value={values.country ?? 'South Africa'}
        onChange={(e) => onChange('country', e.target.value)}
      />
    </div>
  );
}
