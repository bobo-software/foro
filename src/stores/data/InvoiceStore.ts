import { create } from 'zustand';
import InvoiceService from '../../services/invoiceService';
import { useBusinessStore } from './BusinessStore';
import type { Invoice } from '../../types/invoice';

interface InvoiceState {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  fetchInvoices: (params?: { status?: string; projectId?: number }) => Promise<void>;
  removeInvoice: (id: number) => Promise<void>;
  addInvoice: (invoice: Invoice) => void;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  loading: false,
  error: null,

  fetchInvoices: async (params?: { status?: string; projectId?: number }) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const where: Record<string, unknown> = {};
    if (businessId != null) where.business_id = businessId;
    if (params?.status && params.status !== 'all') where.status = params.status;
    if (params?.projectId != null) where.project_id = params.projectId;
    const finalWhere = Object.keys(where).length > 0 ? where : undefined;
    set({ loading: true, error: null });
    try {
      const data = await InvoiceService.findAll({
        where: finalWhere,
        orderBy: 'issue_date',
        orderDirection: 'DESC',
      });
      set({ invoices: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load invoices';
      set({ error: message, loading: false, invoices: [] });
      console.error('Failed to load invoices:', err);
    }
  },

  removeInvoice: async (id: number) => {
    try {
      await InvoiceService.delete(id);
      set({ invoices: get().invoices.filter((inv) => inv.id !== id) });
    } catch (err) {
      throw err;
    }
  },

  addInvoice: (invoice: Invoice) => {
    if (invoice.id != null) set({ invoices: [invoice, ...get().invoices] });
  },
}));
