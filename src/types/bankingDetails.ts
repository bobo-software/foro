/**
 * Banking Details types — bank account information for users and companies
 * Used for displaying payment details on invoices and documents
 */

export type AccountType = 'cheque' | 'savings' | 'current' | 'transmission' | 'gold_business' | 'other';

export interface BankingDetails {
  id?: number;
  /** Reference to authenticated user (optional) */
  user_id?: number;
  /** Reference to company (optional) */
  company_id?: number;
  /** Label for this account (e.g., "Primary Business Account", "Savings") */
  label?: string;
  /** Name of the bank */
  bank_name: string;
  /** Name of the account holder */
  account_holder?: string;
  /** Bank account number */
  account_number: string;
  /** Type of account: cheque, savings, current, transmission */
  account_type?: AccountType;
  /** Branch code (universal or specific) */
  branch_code?: string;
  /** Branch name */
  branch_name?: string;
  /** SWIFT/BIC code for international transfers */
  swift_code?: string;
  /** IBAN for international transfers */
  iban?: string;
  /** Whether this is the primary banking account */
  is_primary?: boolean;
  /** Whether this account is active */
  is_active?: boolean;
  /** Additional notes */
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBankingDetailsDto {
  user_id?: number;
  company_id?: number;
  label?: string;
  bank_name: string;
  account_holder?: string;
  account_number: string;
  account_type?: AccountType;
  branch_code?: string;
  branch_name?: string;
  swift_code?: string;
  iban?: string;
  is_primary?: boolean;
  is_active?: boolean;
  notes?: string;
}

/**
 * Common South African banks with their universal branch codes
 */
export const SA_BANKS = [
  { name: 'ABSA Bank', branchCode: '632005' },
  { name: 'African Bank', branchCode: '430000' },
  { name: 'Bidvest Bank', branchCode: '462005' },
  { name: 'Capitec Bank', branchCode: '470010' },
  { name: 'Discovery Bank', branchCode: '679000' },
  { name: 'First National Bank (FNB)', branchCode: '250655' },
  { name: 'Investec Bank', branchCode: '580105' },
  { name: 'Nedbank', branchCode: '198765' },
  { name: 'Standard Bank', branchCode: '051001' },
  { name: 'TymeBank', branchCode: '678910' },
  { name: 'Other', branchCode: '' },
] as const;

/**
 * Account types available in South Africa
 */
export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'cheque', label: 'Cheque / Current Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'current', label: 'Current Account' },
  { value: 'transmission', label: 'Transmission Account' },
  { value: 'gold_business', label: 'Gold Business Account' },
  { value: 'other', label: 'Other' },
];

/**
 * Format banking details for display on documents
 */
export function formatBankingDetails(details: BankingDetails): string[] {
  const lines: string[] = [];
  
  lines.push(`Bank: ${details.bank_name}`);
  if (details.account_holder) lines.push(`Account Holder: ${details.account_holder}`);
  lines.push(`Account Number: ${details.account_number}`);
  if (details.account_type) {
    const typeLabel = ACCOUNT_TYPES.find(t => t.value === details.account_type)?.label || details.account_type;
    lines.push(`Account Type: ${typeLabel}`);
  }
  if (details.branch_code) lines.push(`Branch Code: ${details.branch_code}`);
  if (details.branch_name) lines.push(`Branch: ${details.branch_name}`);
  if (details.swift_code) lines.push(`SWIFT Code: ${details.swift_code}`);
  if (details.iban) lines.push(`IBAN: ${details.iban}`);
  
  return lines;
}
