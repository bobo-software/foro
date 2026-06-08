import { useEffect } from 'react';
import type { CreateBankingDetailsDto } from '@/types/bankingDetails';
import { ACCOUNT_TYPES } from '@/types/bankingDetails';
import { useBankStore } from '@/stores/data/BankStore';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';

interface CompanyBankingFieldsProps {
  includeBankingDetails: boolean;
  onToggle: (checked: boolean) => void;
  bankingForm: CreateBankingDetailsDto;
  onBankingFormChange: (updates: Partial<CreateBankingDetailsDto>) => void;
  disabled: boolean;
}

export function CompanyBankingFields({
  includeBankingDetails,
  onToggle,
  bankingForm,
  onBankingFormChange,
  disabled,
}: CompanyBankingFieldsProps) {
  const banks = useBankStore((s) => s.banks);
  const fetchBanks = useBankStore((s) => s.fetchBanks);

  useEffect(() => {
    void fetchBanks();
  }, [fetchBanks]);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={includeBankingDetails}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={disabled}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        Add banking details (optional)
      </label>

      {includeBankingDetails && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AppLabeledSelectInput
            label="Bank name *"
            value={bankingForm.bank_name ?? ''}
            onChange={(e) => {
              const selectedBank = banks.find((b) => b.name === e.target.value);
              onBankingFormChange({
                bank_name: e.target.value,
                branch_code: selectedBank?.code ?? bankingForm.branch_code,
              });
            }}
            disabled={disabled}
            options={banks.map((b) => ({ value: b.name, label: b.name }))}
            placeholder="Select bank…"
          />
          <AppInputLabeled
            label="Account number *"
            type="text"
            value={bankingForm.account_number ?? ''}
            onChange={(e) => onBankingFormChange({ account_number: e.target.value })}
            disabled={disabled}
          />
          <AppInputLabeled
            label="Account holder"
            type="text"
            value={bankingForm.account_holder ?? ''}
            onChange={(e) => onBankingFormChange({ account_holder: e.target.value })}
            disabled={disabled}
          />
          <AppLabeledSelectInput
            label="Account type"
            value={bankingForm.account_type ?? 'cheque'}
            onChange={(e) => onBankingFormChange({ account_type: e.target.value as CreateBankingDetailsDto['account_type'] })}
            disabled={disabled}
            options={ACCOUNT_TYPES}
          />
          <AppInputLabeled
            label="Branch code"
            type="text"
            value={bankingForm.branch_code ?? ''}
            onChange={(e) => onBankingFormChange({ branch_code: e.target.value })}
            disabled={disabled}
          />
          <AppInputLabeled
            label="SWIFT code"
            type="text"
            value={bankingForm.swift_code ?? ''}
            onChange={(e) => onBankingFormChange({ swift_code: e.target.value })}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
