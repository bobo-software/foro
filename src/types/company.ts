/**
 * Company types — client businesses (formerly "Customer")
 */

export interface Company {
  id?: number;
  user_id?: number;
  is_owner_company?: boolean;
  business_id?: number;
  /** Company / business name (primary identifier) */
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  /** Alias for backward compatibility - maps to name */
  company_name?: string;
  /** Primary contact person at the company */
  contact_person?: string;
  /** Tax identification number */
  tax_id?: string;
  /** e.g. LLC, Corporation, Sole Proprietorship, Partnership */
  business_type?: string;
  /** Official business/company registration number */
  registration_number?: string;
  /** VAT registration number */
  vat_number?: string;
  /** Industry or sector */
  industry?: string;
  /** Company website */
  website?: string;
  notes?: string;
  /** File path for the company logo stored in MinIO */
  logo_url?: string;
  /** Selected document template id (defaults to 'classic') */
  document_template?: string;
  /** Whether to embed the company logo in generated PDFs */
  show_logo_on_documents?: boolean;
  /** Whether tax/VAT should be applied on this business's invoices and quotations */
  tax_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCompanyDto {
  user_id?: number;
  is_owner_company?: boolean;
  business_id?: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company_name?: string;
  contact_person?: string;
  tax_id?: string;
  business_type?: string;
  registration_number?: string;
  vat_number?: string;
  industry?: string;
  website?: string;
  notes?: string;
  logo_url?: string;
  document_template?: string;
  show_logo_on_documents?: boolean;
  tax_enabled?: boolean;
}
