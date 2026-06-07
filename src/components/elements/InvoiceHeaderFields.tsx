import AppInputLabeled from '../forms/AppLabledInput';
import AppLabeledSelectInput from '../forms/AppLabledSelectInput';
import type { CreateInvoiceDto, InvoiceStatus } from '../../types/invoice';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';

const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TERMS_OPTIONS = [
  { value: 'C.O.D', label: 'C.O.D (Cash on Delivery)' },
  { value: 'Net 7', label: 'Net 7 Days' },
  { value: 'Net 14', label: 'Net 14 Days' },
  { value: 'Net 30', label: 'Net 30 Days' },
  { value: 'Net 60', label: 'Net 60 Days' },
  { value: 'Due on Receipt', label: 'Due on Receipt' },
];

const DELIVERY_OPTIONS = [
  { value: 'collect', label: 'Collect' },
  { value: 'deliver', label: 'Deliver' },
];

interface InvoiceHeaderFieldsProps {
  isCreditNote: boolean;
  formData: Pick<CreateInvoiceDto, 'invoice_number' | 'order_number' | 'status' | 'currency' | 'issue_date' | 'due_date' | 'terms' | 'delivery_conditions'>;
  onChange: (field: keyof CreateInvoiceDto, value: unknown) => void;
}

export function InvoiceHeaderFields({ isCreditNote, formData, onChange }: InvoiceHeaderFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-2 mb-2 md:grid-cols-4">
      <AppInputLabeled
        label={isCreditNote ? 'Credit note #' : 'Invoice #'}
        type="text"
        value={formData.invoice_number}
        onChange={(e) => onChange('invoice_number', e.target.value)}
        required
      />
      <AppInputLabeled
        label="Order #"
        type="text"
        value={formData.order_number || ''}
        onChange={(e) => onChange('order_number', e.target.value)}
        placeholder="PO number"
      />
      <AppLabeledSelectInput
        label="Status"
        value={formData.status}
        onChange={(e) => onChange('status', e.target.value as InvoiceStatus)}
        options={INVOICE_STATUSES}
      />
      <AppLabeledSelectInput
        label="Currency"
        value={formData.currency || 'ZAR'}
        onChange={(e) => onChange('currency', e.target.value)}
        options={SUPPORTED_CURRENCIES}
      />
      <AppInputLabeled
        label="Issue Date"
        type="date"
        value={formData.issue_date}
        onChange={(e) => onChange('issue_date', e.target.value)}
        required
      />
      <AppInputLabeled
        label="Due Date"
        type="date"
        value={formData.due_date}
        onChange={(e) => onChange('due_date', e.target.value)}
        required
      />
      <AppLabeledSelectInput
        label="Terms"
        value={formData.terms || ''}
        onChange={(e) => onChange('terms', e.target.value)}
        options={TERMS_OPTIONS}
        placeholder="Select terms..."
      />
      <AppLabeledSelectInput
        label="Delivery"
        value={formData.delivery_conditions || ''}
        onChange={(e) => onChange('delivery_conditions', e.target.value)}
        options={DELIVERY_OPTIONS}
        placeholder="Select..."
      />
    </div>
  );
}
