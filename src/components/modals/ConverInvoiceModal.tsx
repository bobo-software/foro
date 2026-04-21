import { useEffect, useId, useState } from 'react';
import { LuFileText } from 'react-icons/lu';
import { AppModal } from './AppModal';
import type { InvoiceStatus } from '../../types/invoice';
import { formatCurrency } from '../../utils/currency';

const INVOICE_STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export interface ConverInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: InvoiceStatus) => void | Promise<void>;
  converting: boolean;
  quotationNumber: string;
  quotationStatus: string;
  customerName: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency?: string;
  defaultStatus?: InvoiceStatus;
}

function ConverInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  converting,
  quotationNumber,
  quotationStatus,
  customerName,
  subtotal,
  vatRate,
  vatAmount,
  total,
  currency,
  defaultStatus = 'accepted',
}: ConverInvoiceModalProps) {
  const [status, setStatus] = useState<InvoiceStatus>(defaultStatus);
  const statusSelectId = useId();

  // Reset to the default status each time the modal opens so the user always
  // starts from the configured default (e.g. 'accepted').
  useEffect(() => {
    if (isOpen) setStatus(defaultStatus);
  }, [isOpen, defaultStatus]);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={() => !converting && onClose()}
      title="Convert to Invoice"
      titleIcon={<LuFileText size={16} />}
      size="sm"
      closeOnBackdrop={!converting}
      showCloseButton={!converting}
      buttons={[
        {
          label: 'Cancel',
          variant: 'secondary',
          onClick: onClose,
          disabled: converting,
        },
        {
          label: 'Convert',
          variant: 'primary',
          onClick: () => onConfirm(status),
          loading: converting,
          loadingLabel: 'Converting…',
        },
      ]}
    >
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
        <p>
          Create an invoice from{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {quotationNumber}
          </span>{' '}
          for{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {customerName}
          </span>
          ?
        </p>

        <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 px-4 py-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400 dark:text-slate-500">Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          {vatRate > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-500">VAT ({vatRate}%)</span>
              <span>{formatCurrency(vatAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200 pt-1 border-t border-slate-200 dark:border-slate-600">
            <span>Total</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={statusSelectId}
            className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
          >
            Invoice status
          </label>
          <select
            id={statusSelectId}
            value={status}
            onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
            disabled={converting}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {INVOICE_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            The new invoice will be created with this status.
          </p>
        </div>

        {quotationStatus !== 'accepted' && quotationStatus !== 'sent' && (
          <p className="text-amber-600 dark:text-amber-400 text-xs">
            Note: This quotation has status "{quotationStatus}". Accepted or sent status is recommended before converting.
          </p>
        )}
      </div>
    </AppModal>
  );
}

export default ConverInvoiceModal;
