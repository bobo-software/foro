import AppLabledInput from '@/components/forms/AppLabledInput';

interface BusinessCredentialsValues {
  tax_id?: string;
  registration_number?: string;
  vat_number?: string;
}

interface BusinessCredentialsSectionProps {
  values: BusinessCredentialsValues;
  onChange: (field: string, value: string) => void;
  idPrefix?: string;
}

export function BusinessCredentialsSection({ values, onChange, idPrefix = '' }: BusinessCredentialsSectionProps) {
  const p = idPrefix ? `${idPrefix}-` : '';
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AppLabledInput
        id={`${p}tax_id`}
        label="Tax ID"
        type="text"
        value={values.tax_id ?? ''}
        onChange={(e) => onChange('tax_id', e.target.value)}
      />
      <AppLabledInput
        id={`${p}registration_number`}
        label="Registration Number"
        type="text"
        value={values.registration_number ?? ''}
        onChange={(e) => onChange('registration_number', e.target.value)}
      />
      <AppLabledInput
        id={`${p}vat_number`}
        label="VAT Number"
        type="text"
        value={values.vat_number ?? ''}
        onChange={(e) => onChange('vat_number', e.target.value)}
      />
    </div>
  );
}
