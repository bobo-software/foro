import { useState, useCallback, useEffect } from 'react';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import BankingDetailsService from '@/services/bankingDetailsService';
import type { BankingDetails, CreateBankingDetailsDto } from '@/types/bankingDetails';
import { ACCOUNT_TYPES } from '@/types/bankingDetails';
import { useBankStore } from '@/stores/data/BankStore';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import toast from 'react-hot-toast';
import { bankingDetailsSchema } from '@/validation/schemas';

function getBankingErrorMessage(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : '';
  if (message.includes('No encryption key / secret found')) {
    return 'Field encryption is not configured for this project. Ask an admin to set the encryption key in Skaftin settings.';
  }
  return message || fallback;
}

export function BankingSettingsTab() {
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const loading = useBusinessStore((s) => s.loading);
  const banks = useBankStore((s) => s.banks);
  const fetchBanks = useBankStore((s) => s.fetchBanks);

  const [existingBankingDetails, setExistingBankingDetails] = useState<BankingDetails | null>(null);
  const [bankingForm, setBankingForm] = useState<CreateBankingDetailsDto>({
    user_id: currentBusiness?.user_id,
    label: 'Primary Account',
    bank_name: '',
    account_holder: '',
    account_number: '',
    account_type: 'cheque',
    branch_code: '',
    branch_name: '',
    swift_code: '',
    is_primary: true,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchBanks();
  }, [fetchBanks]);

  // Fetch existing banking details
  useEffect(() => {
    if (currentBusiness?.user_id) {
      BankingDetailsService.findByUserId(currentBusiness.user_id).then((details) => {
        if (details.length > 0) {
          const primaryDetails = details.find(d => d.is_primary) || details[0];
          setExistingBankingDetails(primaryDetails);
          setBankingForm({
            user_id: currentBusiness.user_id,
            label: primaryDetails.label ?? 'Primary Account',
            bank_name: primaryDetails.bank_name ?? '',
            account_holder: primaryDetails.account_holder ?? '',
            account_number: primaryDetails.account_number ?? '',
            account_type: primaryDetails.account_type ?? 'cheque',
            branch_code: primaryDetails.branch_code ?? '',
            branch_name: primaryDetails.branch_name ?? '',
            swift_code: primaryDetails.swift_code ?? '',
            is_primary: primaryDetails.is_primary ?? true,
            is_active: primaryDetails.is_active ?? true,
          });
        }
      }).catch((err: unknown) => {
        toast.error(getBankingErrorMessage(err, 'Failed to load banking details'));
      });
    }
  }, [currentBusiness?.user_id]);

  const handleBankingChange = useCallback((field: keyof CreateBankingDetailsDto, value: string | boolean) => {
    setBankingForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Auto-fill branch code when bank is selected
  const handleBankSelect = useCallback((bankName: string) => {
    const selectedBank = banks.find((b) => b.name === bankName);
    setBankingForm((prev) => ({
      ...prev,
      bank_name: bankName,
      branch_code: selectedBank?.code ?? prev.branch_code,
    }));
  }, [banks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = bankingDetailsSchema.safeParse(bankingForm);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Please check your input');
      return;
    }
    if (!currentBusiness?.user_id) {
      toast.error('No business found');
      return;
    }

    setSaving(true);
    try {
      const bankingData: CreateBankingDetailsDto = {
        user_id: currentBusiness.user_id,
        label: bankingForm.label?.trim() || 'Primary Account',
        bank_name: bankingForm.bank_name.trim(),
        account_holder: bankingForm.account_holder?.trim() || undefined,
        account_number: bankingForm.account_number.trim(),
        account_type: bankingForm.account_type || 'cheque',
        branch_code: bankingForm.branch_code?.trim() || undefined,
        branch_name: bankingForm.branch_name?.trim() || undefined,
        swift_code: bankingForm.swift_code?.trim() || undefined,
        is_primary: true,
        is_active: true,
      };

      if (existingBankingDetails?.id) {
        await BankingDetailsService.update(existingBankingDetails.id, bankingData);
      } else {
        const newBanking = await BankingDetailsService.create(bankingData);
        setExistingBankingDetails(newBanking);
      }

      toast.success('Banking details updated');
    } catch (err: unknown) {
      toast.error(getBankingErrorMessage(err, 'Failed to update banking details'));
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!currentBusiness) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Banking Details</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          No business found. Please complete onboarding first.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
        Banking Details
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Your banking information displayed on invoices and documents for payment purposes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AppLabeledSelectInput
            label="Bank Name *"
            id="bank_name"
            value={bankingForm.bank_name ?? ''}
            onChange={(e) => handleBankSelect(e.target.value)}
            required
            placeholder="Select bank…"
            options={banks.map((bank) => ({ value: bank.name, label: bank.name }))}
          />
          <AppInputLabeled
            label="Account holder"
            type="text"
            value={bankingForm.account_holder ?? ''}
            onChange={(e) => handleBankingChange('account_holder', e.target.value)}
            placeholder="Name on the account"
          />
          <AppInputLabeled
            label="Account number"
            type="text"
            value={bankingForm.account_number ?? ''}
            onChange={(e) => handleBankingChange('account_number', e.target.value)}
            placeholder="1234567890"
            required
          />
          <AppLabeledSelectInput
            label="Account type"
            value={bankingForm.account_type ?? 'cheque'}
            onChange={(e) => handleBankingChange('account_type', e.target.value)}
            options={ACCOUNT_TYPES}
          />
          <AppInputLabeled
            label="Branch code"
            type="text"
            value={bankingForm.branch_code ?? ''}
            onChange={(e) => handleBankingChange('branch_code', e.target.value)}
            placeholder="Universal branch code"
          />
          <AppInputLabeled
            label="Branch name"
            type="text"
            value={bankingForm.branch_name ?? ''}
            onChange={(e) => handleBankingChange('branch_name', e.target.value)}
            placeholder="Optional"
          />
          <AppInputLabeled
            label="SWIFT code"
            type="text"
            value={bankingForm.swift_code ?? ''}
            onChange={(e) => handleBankingChange('swift_code', e.target.value)}
            placeholder="For international transfers"
          />
        </div>

        {/* Preview */}
        {bankingForm.bank_name && bankingForm.account_number && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Preview (as shown on documents)
            </h3>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 space-y-1">
              <p><span className="font-medium">Bank:</span> {bankingForm.bank_name}</p>
              {bankingForm.account_holder && (
                <p><span className="font-medium">Account Holder:</span> {bankingForm.account_holder}</p>
              )}
              <p><span className="font-medium">Account Number:</span> {bankingForm.account_number}</p>
              {bankingForm.account_type && (
                <p><span className="font-medium">Account Type:</span> {ACCOUNT_TYPES.find(t => t.value === bankingForm.account_type)?.label}</p>
              )}
              {bankingForm.branch_code && (
                <p><span className="font-medium">Branch Code:</span> {bankingForm.branch_code}</p>
              )}
              {bankingForm.branch_name && (
                <p><span className="font-medium">Branch:</span> {bankingForm.branch_name}</p>
              )}
              {bankingForm.swift_code && (
                <p><span className="font-medium">SWIFT Code:</span> {bankingForm.swift_code}</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save Banking Details'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default BankingSettingsTab;
