import { create } from 'zustand';
import CompanyService from '../../services/companyService';
import type { Business } from '../../types/business';

interface BusinessState {
  currentBusiness: Business | null;
  businesses: Business[];
  loading: boolean;
  error: string | null;
  fetchUserBusinesses: (userId: number) => Promise<void>;
  setCurrentBusiness: (business: Business | null) => void;
}

export const useBusinessStore = create<BusinessState>((set) => ({
  currentBusiness: null,
  businesses: [],
  loading: false,
  error: null,

  fetchUserBusinesses: async (userId: number) => {
    set({ loading: true, error: null });
    try {
      const businesses = (await CompanyService.getOwnerCompaniesForUser(userId)) as Business[];
      set({
        businesses,
        currentBusiness: businesses[0] || null,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load businesses';
      set({ error: message, loading: false, businesses: [], currentBusiness: null });
      console.error('Failed to load businesses:', err);
    }
  },

  setCurrentBusiness: (business: Business | null) => {
    set({ currentBusiness: business });
  },
}));
