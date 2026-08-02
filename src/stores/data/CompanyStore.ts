import { create } from 'zustand';
import CompanyService from '../../services/companyService';
import { useBusinessStore } from './BusinessStore';
import type { Company } from '../../types/company';

interface CompanyState {
  companies: Company[];
  loading: boolean;
  error: string | null;
  fetchCompanies: () => Promise<void>;
  removeCompany: (id: number) => Promise<void>;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [],
  loading: false,
  error: null,

  fetchCompanies: async () => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const where = businessId != null ? { businessId } : undefined;
    set({ loading: true, error: null });
    try {
      const data = await CompanyService.findAll({
        where,
        orderBy: 'name',
        orderDirection: 'ASC',
      });
      set({ companies: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load companies';
      set({ error: message, loading: false });
      console.error('Failed to load companies:', err);
    }
  },

  removeCompany: async (id: number) => {
    try {
      await CompanyService.delete(id);
      set({ companies: get().companies.filter((c) => c.id !== id) });
    } catch (err) {
      throw err;
    }
  },
}));
