/**
 * Shared types for company detail tabs
 */
import type { Company } from '@/types/company';
import type { Invoice } from '@/types/invoice';
import type { Quotation } from '@/types/quotation';
import type { Payment } from '@/types/payment';
import type { Project } from '@/types/project';

export type ProjectScope = 'all' | number;

export interface CompanyTabProps {
  company: Company;
  projects?: Project[];
  selectedProjectId?: ProjectScope;
  invoices: Invoice[];
  quotations: Quotation[];
  payments: Payment[];
  docsLoading: boolean;
  onCompanyUpdate?: (company: Company) => void;
}

export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  sole_proprietorship: 'Sole Proprietorship',
  partnership: 'Partnership',
  llc: 'LLC',
  corporation: 'Corporation',
  other: 'Other',
};

export function formatDate(str: string) {
  return new Date(str).toLocaleDateString();
}
