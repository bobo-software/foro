import { create } from 'zustand';
import BankingDetailsService from '../../services/bankingDetailsService';
import ContactService from '../../services/contactService';
import { useBusinessStore } from './BusinessStore';
import type { BankingDetails } from '../../types/bankingDetails';
import type { Contact } from '../../types/contact';

/**
 * Banking + contacts for the current business (issuer), used on quotation/invoice PDF views.
 */
interface BusinessDocumentContextState {
  bankingDetails: BankingDetails[];
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  loadForCurrentBusiness: () => Promise<void>;
  reset: () => void;
}

export const useBusinessDocumentContextStore = create<BusinessDocumentContextState>((set) => ({
  bankingDetails: [],
  contacts: [],
  loading: false,
  error: null,

  loadForCurrentBusiness: async () => {
    const business = useBusinessStore.getState().currentBusiness;
    if (business?.id == null) {
      set({ bankingDetails: [], contacts: [], loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const fetchBanking =
        business.user_id != null
          ? BankingDetailsService.findByUserId(business.user_id)
          : BankingDetailsService.findByCompanyId(business.id);
      const [details, contactRows] = await Promise.all([
        fetchBanking,
        ContactService.findByCompanyId(business.id),
      ]);
      set({
        bankingDetails: details.filter((d) => d.is_active !== false),
        contacts: contactRows,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load business context';
      set({ error: message, bankingDetails: [], contacts: [], loading: false });
    }
  },

  reset: () => set({ bankingDetails: [], contacts: [], loading: false, error: null }),
}));
