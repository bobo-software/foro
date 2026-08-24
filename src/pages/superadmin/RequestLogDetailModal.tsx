import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LuCheck, LuCopy } from 'react-icons/lu';
import { AppModal } from '@/components/modals/AppModal';
import { requestLogService, type RequestLogDetail } from '@/services/requestLogService';

interface RequestLogDetailModalProps {
  id: number;
  onClose: () => void;
}

function statusTone(status: number): { bg: string; text: string; label: string } {
  if (status >= 500) return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', label: 'Server error' };
  if (status >= 400) return { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', label: 'Client error' };
  if (status >= 300) return { bg: 'bg-slate-100 dark:bg-slate-700/40', text: 'text-slate-700 dark:text-slate-300', label: 'Redirect' };
  return { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', label: 'Success' };
}

function formatTimestamp(raw: string): string {
  return new Date(`${raw.replace(' ', 'T')}Z`).toLocaleString();
}

function prettyBody(raw: string | null): { text: string; truncated: boolean } {
  if (!raw) return { text: '', truncated: false };
  const truncated = raw.endsWith('...[truncated]');
  const candidate = truncated ? raw.slice(0, -'...[truncated]'.length) : raw;
  try {
    return { text: JSON.stringify(JSON.parse(candidate), null, 2), truncated };
  } catch {
    return { text: raw, truncated };
  }
}

function MetaTile({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`mt-0.5 text-sm text-slate-800 dark:text-slate-200 truncate ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function CodeBlock({ title, raw }: { title: string; raw: string | null }) {
  const [copied, setCopied] = useState(false);
  const { text, truncated } = prettyBody(raw);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
        {text && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {copied ? <LuCheck className="w-3.5 h-3.5" /> : <LuCopy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      {text ? (
        <div>
          <pre className="rounded-lg bg-slate-900 dark:bg-black/40 text-slate-100 text-xs p-3 overflow-auto max-h-64 font-mono leading-relaxed">
            {text}
          </pre>
          {truncated && (
            <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Truncated for storage — payload was larger than the logged limit.</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">No body</p>
      )}
    </div>
  );
}

export function RequestLogDetailModal({ id, onClose }: RequestLogDetailModalProps) {
  const [detail, setDetail] = useState<RequestLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    requestLogService
      .get(id)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load request details');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const tone = detail ? statusTone(detail.statusCode) : null;

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={detail ? `${detail.method} ${detail.url}` : 'Request details'}
      size="2xl"
      footer={null}
    >
      {loading && <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Loading…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400 py-8 text-center">{error}</p>}

      {detail && tone && (
        <div className="space-y-5">
          <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${tone.bg}`}>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-white/70 dark:bg-black/20 text-xs font-semibold text-slate-700 dark:text-slate-200">
                {detail.method}
              </span>
              <span className={`text-xl font-bold ${tone.text}`}>{detail.statusCode}</span>
              <span className={`text-xs font-medium ${tone.text}`}>{tone.label}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Log #{detail.id}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <MetaTile label="Timestamp" value={formatTimestamp(detail.createdAt)} />
            <MetaTile label="Duration" value={`${detail.durationMs} ms`} />
            <MetaTile label="IP Address" value={detail.ipAddress ?? '—'} mono />
            <MetaTile label="User" value={detail.userEmail ?? (detail.userId ? `#${detail.userId}` : 'Anonymous')} />
            <MetaTile label="Company" value={detail.companyId != null ? String(detail.companyId) : '—'} />
            <MetaTile label="User Agent" value={detail.userAgent ?? '—'} mono />
          </div>

          <CodeBlock title="Request Payload" raw={detail.requestBody} />
          <CodeBlock title="Response Data" raw={detail.responseBody} />
        </div>
      )}
    </AppModal>
  );
}

export default RequestLogDetailModal;
