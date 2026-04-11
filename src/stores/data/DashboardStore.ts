import { create } from 'zustand';
import CompanyService from '../../services/companyService';
import InvoiceService from '../../services/invoiceService';
import QuotationService from '../../services/quotationService';
import ItemService from '../../services/itemService';
import BankingDetailsService from '../../services/bankingDetailsService';
import type { Invoice } from '../../types/invoice';

export interface DashboardStats {
  companies: number;
  invoices: number;
  quotations: number;
  items: number;
}

interface DashboardState {
  stats: DashboardStats;
  recentInvoices: Invoice[];
  loading: boolean;
  error: string | null;
  hasBankingDetails: boolean;
  bankingLoading: boolean;
  loadSnapshot: (businessId: number | null | undefined) => Promise<void>;
  loadBankingPresence: (userId: number | null | undefined) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: { companies: 0, invoices: 0, quotations: 0, items: 0 },
  recentInvoices: [],
  loading: true,
  error: null,
  hasBankingDetails: false,
  bankingLoading: false,

  loadSnapshot: async (businessId) => {
    set({ loading: true, error: null });
    try {
      const businessWhere = businessId != null ? { business_id: businessId } : undefined;
      const [companies, invoices, quotations, items, recent] = await Promise.all([
        CompanyService.count(businessWhere),
        InvoiceService.count(businessWhere),
        QuotationService.count(businessWhere),
        ItemService.count(businessWhere),
        InvoiceService.findAll({
          where: businessWhere,
          orderBy: 'issue_date',
          orderDirection: 'DESC',
          limit: 5,
        }),
      ]);
      set({
        stats: { companies, invoices, quotations, items },
        recentInvoices: recent,
        loading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to load dashboard',
        loading: false,
      });
    }
  },

  loadBankingPresence: async (userId) => {
    if (!userId) {
      set({ hasBankingDetails: false, bankingLoading: false });
      return;
    }
    set({ bankingLoading: true });
    try {
      const rows = await BankingDetailsService.findByUserId(Number(userId));
      set({ hasBankingDetails: rows.length > 0, bankingLoading: false });
    } catch {
      set({ hasBankingDetails: false, bankingLoading: false });
    }
  },
}));
