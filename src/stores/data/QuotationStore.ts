import { create } from 'zustand';
import QuotationService from '../../services/quotationService';
import QuotationLineService from '../../services/quotationLineService';
import { useBusinessStore } from './BusinessStore';
import type { Quotation, QuotationLine, CreateQuotationDto } from '../../types/quotation';

/** Line rows for create/update/duplicate (no id / quotation_id) */
export type QuotationLineInput = Omit<QuotationLine, 'id' | 'quotation_id'> & { item_id?: number };

interface QuotationState {
  quotations: Quotation[];
  loading: boolean;
  error: string | null;
  fetchQuotations: (params?: { status?: string; projectId?: number }) => Promise<void>;
  removeQuotation: (id: number) => Promise<void>;
  addQuotation: (quotation: Quotation) => void;
  fetchQuotationWithLines: (id: number) => Promise<{ quotation: Quotation | null; lines: QuotationLine[] }>;
  saveQuotationWithLines: (args: {
    quotationId?: number;
    payload: CreateQuotationDto;
    lines: QuotationLineInput[];
  }) => Promise<number | undefined>;
  duplicateQuotationWithLines: (payload: CreateQuotationDto, lines: QuotationLineInput[]) => Promise<number | undefined>;
  getNextQuotationNumber: () => Promise<string>;
  markQuotationConverted: (quotationId: number, invoiceId: number) => Promise<void>;
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

  fetchQuotationWithLines: async (id: number) => {
    const [quotationRaw, lines] = await Promise.all([
      QuotationService.findById(id),
      QuotationLineService.findByQuotationId(id),
    ]);
    let quotation = quotationRaw;
    if (quotation) {
      quotation = await QuotationService.repairStaleConversionLink(id, quotation);
    }
    return { quotation, lines: Array.isArray(lines) ? lines : [] };
  },

  saveQuotationWithLines: async ({ quotationId, payload, lines }) => {
    const { items: _drop, ...row } = payload;
    if (quotationId != null) {
      await QuotationService.update(quotationId, row);
      await QuotationLineService.deleteByQuotationId(quotationId);
      if (lines.length) await QuotationLineService.insertMany(quotationId, lines);
      return quotationId;
    }
    const created = await QuotationService.create(row);
    const newId = created.id;
    if (newId != null && lines.length) await QuotationLineService.insertMany(newId, lines);
    return newId;
  },

  duplicateQuotationWithLines: async (payload, lines) => {
    const { items: _drop, ...row } = payload;
    const created = await QuotationService.create(row);
    const newId = created.id;
    if (newId != null && lines.length) await QuotationLineService.insertMany(newId, lines);
    return newId;
  },

  getNextQuotationNumber: () => QuotationService.getNextNumber(),

  markQuotationConverted: async (quotationId: number, invoiceId: number) => {
    try {
      await QuotationService.update(quotationId, {
        status: 'converted',
        converted_invoice_id: invoiceId,
      });
    } catch {
      /* optional column */
    }
    set({
      quotations: get().quotations.map((q) =>
        q.id === quotationId
          ? { ...q, status: 'converted' as const, converted_invoice_id: invoiceId }
          : q
      ),
    });
  },
}));
