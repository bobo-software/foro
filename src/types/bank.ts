/**
 * South African bank reference data (BASA / payment gateway catalog)
 */

export interface Bank {
  id: number;
  external_id: number;
  name: string;
  slug: string;
  code: string;
  longcode?: string | null;
  gateway?: string | null;
  pay_with_bank: boolean;
  supports_transfer: boolean;
  available_for_direct_debit: boolean;
  active: boolean;
  country: string;
  currency: string;
  type?: string | null;
  is_deleted: boolean;
  created_at?: string;
  updated_at?: string | null;
}
