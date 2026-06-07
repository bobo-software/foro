import type { CreateCompanyDto } from '@/types/company';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';

const BUSINESS_TYPES = [
  { value: '', label: 'Select type…' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'other', label: 'Other' },
];

interface CompanyCredentialsFieldsProps {
  form: Pick<CreateCompanyDto, 'business_type' | 'tax_id' | 'registration_number' | 'vat_number' | 'industry' | 'website' | 'notes'>;
  onChange: (key: keyof CreateCompanyDto, value: string) => void;
  disabled: boolean;
}

export function CompanyCredentialsFields({ form, onChange, disabled }: CompanyCredentialsFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <AppLabeledSelectInput
          label="Business type"
          value={form.business_type ?? ''}
          onChange={(e) => onChange('business_type', e.target.value)}
          disabled={disabled}
          options={BUSINESS_TYPES}
        />
        <AppInputLabeled
          label="Tax ID"
          type="text"
          value={form.tax_id ?? ''}
          onChange={(e) => onChange('tax_id', e.target.value)}
          disabled={disabled}
          placeholder="EIN, SSN, or local tax number"
        />
        <AppInputLabeled
          label="Registration number"
          type="text"
          value={form.registration_number ?? ''}
          onChange={(e) => onChange('registration_number', e.target.value)}
          disabled={disabled}
          placeholder="Official company registration number"
        />
        <AppInputLabeled
          label="VAT number"
          type="text"
          value={form.vat_number ?? ''}
          onChange={(e) => onChange('vat_number', e.target.value)}
          disabled={disabled}
        />
        <AppInputLabeled
          label="Industry"
          type="text"
          value={form.industry ?? ''}
          onChange={(e) => onChange('industry', e.target.value)}
          disabled={disabled}
          placeholder="e.g. Retail, Manufacturing"
        />
        <AppInputLabeled
          label="Website"
          type="text"
          value={form.website ?? ''}
          onChange={(e) => onChange('website', e.target.value)}
          disabled={disabled}
          placeholder="https://"
        />
      </div>
      <AppLabeledAreaInput
        label="Notes"
        rows={4}
        value={form.notes ?? ''}
        onChange={(e) => onChange('notes', e.target.value)}
        disabled={disabled}
        placeholder="Additional notes about this company"
      />
    </div>
  );
}
