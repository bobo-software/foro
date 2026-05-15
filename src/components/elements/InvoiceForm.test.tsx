import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MAX_BILLABLE_ROLLUP_ROWS } from '../../services/timeEntryService';
import { InvoiceForm } from './InvoiceForm';

const hoisted = vi.hoisted(() => ({
  sumBillable: vi.fn(),
  fetchProjects: vi.fn(),
  businessState: {
    currentBusiness: { id: 7, name: 'Biz' } as { id: number; name: string } | null,
  },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: hoisted.toastSuccess,
    error: hoisted.toastError,
  },
}));

vi.mock('../../services/timeEntryService', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../services/timeEntryService')>();
  return {
    __esModule: true,
    BILLABLE_ROLLUP_PAGE_SIZE: mod.BILLABLE_ROLLUP_PAGE_SIZE,
    MAX_BILLABLE_ROLLUP_PAGES: mod.MAX_BILLABLE_ROLLUP_PAGES,
    MAX_BILLABLE_ROLLUP_ROWS: mod.MAX_BILLABLE_ROLLUP_ROWS,
    default: {
      findAll: mod.default.findAll.bind(mod.default),
      create: mod.default.create.bind(mod.default),
      sumBillableMinutesForProject: hoisted.sumBillable,
    },
  };
});

vi.mock('../../stores/data/CompanyStore', () => ({
  useCompanyStore: (sel: (s: { companies: unknown[]; fetchCompanies: ReturnType<typeof vi.fn> }) => unknown) =>
    sel({
      companies: [{ id: 10, name: 'Acme Co', email: '', address: '', vat_number: '' }],
      fetchCompanies: vi.fn().mockResolvedValue(undefined),
    }),
}));

vi.mock('../../stores/data/ItemStore', () => ({
  useItemStore: (sel: (s: { items: unknown[]; fetchItems: ReturnType<typeof vi.fn> }) => unknown) =>
    sel({
      items: [],
      fetchItems: vi.fn().mockResolvedValue(undefined),
    }),
}));

vi.mock('../../stores/data/ProjectStore', () => ({
  useProjectStore: {
    getState: () => ({
      fetchProjectsForCompany: hoisted.fetchProjects,
    }),
  },
}));

vi.mock('../../stores/data/InvoiceStore', () => ({
  useInvoiceStore: {
    getState: () => ({
      peekNextInvoiceNumber: () => Promise.resolve('INV-NEXT'),
      peekNextCreditNoteNumber: () => Promise.resolve('CN-NEXT'),
      fetchInvoiceWithItems: vi.fn(),
      saveInvoiceWithLines: vi.fn(),
      createInvoiceWithLines: vi.fn(),
    }),
  },
}));

vi.mock('../../stores/data/BusinessStore', () => ({
  useBusinessStore: (sel: (s: { currentBusiness: { id: number; name: string } | null }) => unknown) =>
    sel(hoisted.businessState),
}));

describe('InvoiceForm billable time summary', () => {
  beforeEach(() => {
    hoisted.sumBillable.mockReset();
    hoisted.fetchProjects.mockReset();
    hoisted.toastSuccess.mockReset();
    hoisted.toastError.mockReset();
    hoisted.businessState.currentBusiness = { id: 7, name: 'Biz' };
    hoisted.fetchProjects.mockResolvedValue([
      { id: 99, company_id: 10, name: 'Project 99', business_id: 7 },
    ]);
    hoisted.sumBillable.mockResolvedValue({ totalMinutes: 90, entryCount: 1, capped: false });
  });

  it('loads billable rollup when company + project are prefilled', async () => {
    render(<InvoiceForm initialCompanyId={10} initialProjectId={99} onCancel={() => {}} />);

    await waitFor(() => {
      expect(hoisted.sumBillable).toHaveBeenCalledWith({
        project_id: 99,
        business_id: 7,
      });
    });

    await waitFor(() => {
      const t = screen.getByTestId('invoice-billable-summary').textContent ?? '';
      expect(t).toMatch(/1\.5 h/);
      expect(t).toMatch(/1 billable entry/);
    });
  });

  it('uses current business when project has no business_id', async () => {
    hoisted.fetchProjects.mockResolvedValue([
      { id: 88, company_id: 10, name: 'No biz on row', business_id: undefined },
    ]);

    render(<InvoiceForm initialCompanyId={10} initialProjectId={88} onCancel={() => {}} />);

    await waitFor(() => {
      expect(hoisted.sumBillable).toHaveBeenCalledWith({
        project_id: 88,
        business_id: 7,
      });
    });
  });

  it('shows guidance when project and store lack business_id', async () => {
    hoisted.fetchProjects.mockResolvedValue([
      { id: 77, company_id: 10, name: 'Orphan project', business_id: null },
    ]);
    hoisted.businessState.currentBusiness = null;

    render(<InvoiceForm initialCompanyId={10} initialProjectId={77} onCancel={() => {}} />);

    expect(hoisted.sumBillable).not.toHaveBeenCalled();

    const el = await screen.findByTestId('invoice-billable-summary');
    expect(el.textContent).toMatch(/Select an active business/);
  });

  it('shows empty copy when there are no billable rows', async () => {
    hoisted.sumBillable.mockResolvedValue({ totalMinutes: 0, entryCount: 0, capped: false });

    render(<InvoiceForm initialCompanyId={10} initialProjectId={99} onCancel={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId('invoice-billable-summary').textContent).toMatch(/No billable time entries/);
    });
  });

  it('flags capped rollups in the summary', async () => {
    hoisted.sumBillable.mockResolvedValue({
      totalMinutes: 6000,
      entryCount: MAX_BILLABLE_ROLLUP_ROWS,
      capped: true,
    });

    render(<InvoiceForm initialCompanyId={10} initialProjectId={99} onCancel={() => {}} />);

    await waitFor(() => {
      const t = screen.getByTestId('invoice-billable-summary').textContent ?? '';
      expect(t).toMatch(/scan limited/);
      expect(t).toMatch(String(MAX_BILLABLE_ROLLUP_ROWS));
    });
  });

  it('adds a line item when Add billable time is clicked', async () => {
    const user = userEvent.setup();
    hoisted.sumBillable.mockResolvedValueOnce({ totalMinutes: 90, entryCount: 1, capped: false }).mockResolvedValueOnce({
      totalMinutes: 90,
      entryCount: 1,
      capped: false,
    });

    render(<InvoiceForm initialCompanyId={10} initialProjectId={99} onCancel={() => {}} />);

    await screen.findByTestId('invoice-billable-summary');
    await user.click(screen.getByRole('button', { name: /add billable time as line item/i }));

    await waitFor(() => {
      expect(hoisted.toastSuccess).toHaveBeenCalled();
    });

    expect(screen.getByText(/Billable time — Project 99/i)).toBeInTheDocument();
  });
});
