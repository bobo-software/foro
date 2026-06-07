import { MAX_BILLABLE_ROLLUP_ROWS } from '../../services/timeEntryService';

interface InvoiceBillableTimeSummaryProps {
  loading: boolean;
  isStale: boolean;
  needsBusiness: boolean;
  totalMinutes: number;
  entryCount: number;
  capped: boolean;
  appending: boolean;
  onAppend: () => void;
}

export function InvoiceBillableTimeSummary({
  loading,
  isStale,
  needsBusiness,
  totalMinutes,
  entryCount,
  capped,
  appending,
  onAppend,
}: InvoiceBillableTimeSummaryProps) {
  const summaryText = (() => {
    if (loading || isStale) return 'Loading billable time summary…';
    if (needsBusiness) return 'Select an active business in the app to load billable time for this project.';
    if (entryCount === 0) return 'No billable time entries for this project.';
    const hours = (totalMinutes / 60).toFixed(1);
    const entriesLabel = entryCount === 1 ? 'entry' : 'entries';
    const cappedNote = capped ? ` (scan limited — may be incomplete beyond ~${MAX_BILLABLE_ROLLUP_ROWS.toLocaleString()} rows).` : '.';
    return `Billable time: ${hours} h across ${entryCount} billable ${entriesLabel}${cappedNote}`;
  })();

  const canAppend = !loading && !isStale && !needsBusiness && entryCount > 0 && !appending;

  return (
    <>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400" data-testid="invoice-billable-summary">
        {summaryText}
      </p>
      <button
        type="button"
        disabled={!canAppend}
        onClick={onAppend}
        className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-40 disabled:no-underline"
      >
        {appending ? 'Adding…' : 'Add billable time as line item'}
      </button>
    </>
  );
}
