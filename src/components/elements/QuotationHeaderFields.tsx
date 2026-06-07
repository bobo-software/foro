import type { CreateQuotationDto, QuotationStatus } from '../../types/quotation';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';

interface QuotationHeaderFieldsProps {
  formData: Pick<CreateQuotationDto, 'quotation_number' | 'order_number' | 'status' | 'currency' | 'issue_date' | 'valid_until' | 'terms' | 'delivery_conditions'>;
  onChange: (field: keyof CreateQuotationDto, value: unknown) => void;
  inputClass: string;
  labelClass: string;
  groupClass: string;
}

export function QuotationHeaderFields({ formData, onChange, inputClass, labelClass, groupClass }: QuotationHeaderFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
      <div className={groupClass}>
        <label htmlFor="quotation_number" className={labelClass}>Quotation #</label>
        <input
          id="quotation_number"
          type="text"
          value={formData.quotation_number}
          onChange={(e) => onChange('quotation_number', e.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div className={groupClass}>
        <label htmlFor="order_number" className={labelClass}>Order #</label>
        <input
          id="order_number"
          type="text"
          value={formData.order_number || ''}
          onChange={(e) => onChange('order_number', e.target.value)}
          className={inputClass}
          placeholder="PO number"
        />
      </div>
      <div className={groupClass}>
        <label htmlFor="status" className={labelClass}>Status</label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) => onChange('status', e.target.value as QuotationStatus)}
          className={inputClass}
        >
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
          <option value="converted">Converted</option>
        </select>
      </div>
      <div className={groupClass}>
        <label htmlFor="currency" className={labelClass}>Currency</label>
        <select
          id="currency"
          value={formData.currency || 'ZAR'}
          onChange={(e) => onChange('currency', e.target.value)}
          className={inputClass}
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className={groupClass}>
        <label htmlFor="issue_date" className={labelClass}>Issue Date</label>
        <input
          id="issue_date"
          type="date"
          value={formData.issue_date}
          onChange={(e) => onChange('issue_date', e.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div className={groupClass}>
        <label htmlFor="valid_until" className={labelClass}>Valid Until</label>
        <input
          id="valid_until"
          type="date"
          value={formData.valid_until || ''}
          onChange={(e) => onChange('valid_until', e.target.value || undefined)}
          className={inputClass}
        />
      </div>
      <div className={groupClass}>
        <label htmlFor="terms" className={labelClass}>Terms</label>
        <select
          id="terms"
          value={formData.terms || ''}
          onChange={(e) => onChange('terms', e.target.value)}
          className={inputClass}
        >
          <option value="">Select terms…</option>
          <option value="C.O.D">C.O.D (Cash on Delivery)</option>
          <option value="Net 7">Net 7 Days</option>
          <option value="Net 14">Net 14 Days</option>
          <option value="Net 30">Net 30 Days</option>
          <option value="Net 60">Net 60 Days</option>
          <option value="Due on Receipt">Due on Receipt</option>
        </select>
      </div>
      <div className={groupClass}>
        <label htmlFor="delivery_conditions" className={labelClass}>Delivery</label>
        <select
          id="delivery_conditions"
          value={formData.delivery_conditions || ''}
          onChange={(e) => onChange('delivery_conditions', e.target.value)}
          className={inputClass}
        >
          <option value="">Select…</option>
          <option value="collect">Collect</option>
          <option value="deliver">Deliver</option>
        </select>
      </div>
    </div>
  );
}
