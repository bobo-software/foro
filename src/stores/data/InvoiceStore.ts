import { create } from 'zustand';
import InvoiceService from '../../services/invoiceService';
import InvoiceItemService from '../../services/invoiceItemService';
import QuotationService from '../../services/quotationService';
import { useBusinessStore } from './BusinessStore';
import type { Invoice, CreateInvoiceDto, InvoiceItem } from '../../types/invoice';

export type InvoiceLineInput = Omit<InvoiceItem, 'id' | 'invoice_id'> & { item_id?: number };

interface InvoiceState {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  fetchInvoices: (params?: { status?: string; projectId?: number }) => Promise<void>;
  removeInvoice: (id: number) => Promise<void>;
  addInvoice: (invoice: Invoice) => void;
  fetchInvoiceWithItems: (id: number) => Promise<{ invoice: Invoice | null; items: InvoiceItem[] }>;
  peekNextInvoiceNumber: () => Promise<string>;
  peekNextCreditNoteNumber: () => Promise<string>;
  createInvoiceWithLines: (header: CreateInvoiceDto, lines: InvoiceLineInput[]) => Promise<number>;
  saveInvoiceWithLines: (
    invoiceId: number,
    header: Partial<CreateInvoiceDto>,
    lines: InvoiceLineInput[]
  ) => Promise<void>;
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
      try {
        await QuotationService.clearConversionForDeletedInvoice(id);
      } catch {
        /* quotations table may lack converted_invoice_id */
      }
      set({ invoices: get().invoices.filter((inv) => inv.id !== id) });
    } catch (err) {
      throw err;
    }
  },

  addInvoice: (invoice: Invoice) => {
    if (invoice.id != null) set({ invoices: [invoice, ...get().invoices] });
  },

  fetchInvoiceWithItems: async (id: number) => {
    const [invoice, raw] = await Promise.all([
      InvoiceService.findById(id),
      InvoiceItemService.findByInvoiceId(id),
    ]);
    return { invoice, items: Array.isArray(raw) ? raw : [] };
  },

  peekNextInvoiceNumber: async () => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const where: Record<string, unknown> = { document_kind: 'invoice' };
    if (businessId != null) where.business_id = businessId;
    const count = await InvoiceService.count(where);
    return String(count + 1).padStart(4, '0');
  },

  peekNextCreditNoteNumber: async () => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const where: Record<string, unknown> = { document_kind: 'credit_note' };
    if (businessId != null) where.business_id = businessId;
    const count = await InvoiceService.count(where);
    return `CN-${String(count + 1).padStart(4, '0')}`;
  },

  createInvoiceWithLines: async (header, lines) => {
    const { items: _drop, ...row } = header;
    const created = await InvoiceService.create(row as CreateInvoiceDto);
    const newId = created.id;
    if (newId == null) {
      throw new Error('Invoice was created but no id was returned');
    }
    if (lines.length) await InvoiceItemService.insertMany(newId, lines);
    return newId;
  },

  saveInvoiceWithLines: async (invoiceId, header, lines) => {
    const { items: _drop, ...row } = header;
    await InvoiceService.update(invoiceId, row);
    await InvoiceItemService.deleteByInvoiceId(invoiceId);
    if (lines.length) await InvoiceItemService.insertMany(invoiceId, lines);
  },
}));
