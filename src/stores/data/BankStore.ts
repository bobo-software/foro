import { create } from 'zustand';
import BankService from '../../services/bankService';
import type { Bank } from '../../types/bank';

interface BankState {
  banks: Bank[];
  loading: boolean;
  error: string | null;
  fetchBanks: (force?: boolean) => Promise<void>;
  getBankByName: (name: string) => Bank | undefined;
}

export const useBankStore = create<BankState>((set, get) => ({
  banks: [],
  loading: false,
  error: null,

  fetchBanks: async (force = false) => {
    if (!force && get().banks.length > 0) return;

    set({ loading: true, error: null });
    try {
      const data = await BankService.findActive();
      set({ banks: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load banks';
      set({ error: message, loading: false });
      console.error('Failed to load banks:', err);
    }
  },

  getBankByName: (name: string) => get().banks.find((b) => b.name === name),
}));
