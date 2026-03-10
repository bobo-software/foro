import { create } from 'zustand';
import QuotationService from '../../services/quotationService';
import { useBusinessStore } from './BusinessStore';
import type { Quotation } from '../../types/quotation';

interface QuotationState {
  quotations: Quotation[];
  loading: boolean;
  error: string | null;
  fetchQuotations: (params?: { status?: string; projectId?: number }) => Promise<void>;
  removeQuotation: (id: number) => Promise<void>;
  addQuotation: (quotation: Quotation) => void;
}

export const useQuotationStore = create<QuotationState>((set, get) => ({
  quotations: [],
  loading: false,
  error: null,

  fetchQuotations: async (params?: { status?: string; projectId?: number }) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const where: Record<string, unknown> = {};
    if (businessId != null) where.business_id = businessId;
    if (params?.status && params.status !== 'all') where.status = params.status;
    if (params?.projectId != null) where.project_id = params.projectId;
    const finalWhere = Object.keys(where).length > 0 ? where : undefined;
    set({ loading: true, error: null });
    try {
      const data = await QuotationService.findAll({
        where: finalWhere,
        orderBy: 'issue_date',
        orderDirection: 'DESC',
      });
      set({ quotations: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load quotations';
      set({ error: message, loading: false, quotations: [] });
      console.error('Failed to load quotations:', err);
    }
  },

  removeQuotation: async (id: number) => {
    try {
      await QuotationService.delete(id);
      set({ quotations: get().quotations.filter((q) => q.id !== id) });
    } catch (err) {
      throw err;
    }
  },

  addQuotation: (quotation: Quotation) => {
    if (quotation.id != null) set({ quotations: [quotation, ...get().quotations] });
  },
}));
