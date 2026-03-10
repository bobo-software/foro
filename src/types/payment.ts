/**
 * Payment types — customer payments (reduces balance)
 */

export type PaymentMethod =
  | 'cash'
  | 'eft'
  | 'card'
  | 'cheque'
  | 'bank_transfer'
  | 'other';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'eft', label: 'EFT' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];

export interface Payment {
  id?: number;
  business_id?: number | null;
  company_id?: number | null;
  project_id?: number | null;
  customer_name: string;
  amount: number;
  currency: string;
  date: string;
  payment_method?: PaymentMethod | string;
  reference?: string;
  invoice_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePaymentDto {
  business_id?: number | null;
  company_id?: number | null;
  project_id?: number | null;
  customer_name: string;
  amount: number;
  currency: string;
  date: string;
  payment_method?: PaymentMethod | string;
  reference?: string;
  invoice_id?: number | null;
}
