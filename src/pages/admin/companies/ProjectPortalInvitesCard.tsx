import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PortalInviteService from '@/services/portalInviteService';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import type { PortalInviteSummary } from '@/types/portalInvite';

function formatExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ProjectPortalInvitesCard({
  projectId,
  businessId,
  projectName,
}: {
  projectId: number;
  businessId: number;
  projectName: string;
}) {
  const [rows, setRows] = useState<PortalInviteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('');
  const [lastCreatedUrl, setLastCreatedUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await PortalInviteService.findByProject(projectId, businessId));
    } catch {
      setRows([]);
      toast.error('Could not load portal invites');
    } finally {
      setLoading(false);
    }
  }, [projectId, businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createInvite = useCallback(async () => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 14);
    setBusy(true);
    try {
      const { plaintextToken } = await PortalInviteService.createInvite({
        business_id: businessId,
        project_id: projectId,
        label: label.trim() || null,
        expiresAt: expires,
      });
      const url = `${window.location.origin}/portal/v/${encodeURIComponent(plaintextToken)}`;
      setLastCreatedUrl(url);
      setLabel('');
      await load();
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Portal link copied to clipboard');
      } catch {
        toast.success(`Portal link (copy manually): ${url}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create invite');
    } finally {
      setBusy(false);
    }
  }, [businessId, projectId, label, load]);

  const revoke = useCallback(
    async (id: number) => {
      if (!window.confirm('Revoke this portal link? It will stop working.')) return;
      setBusy(true);
      try {
        await PortalInviteService.revoke(id, businessId);
        toast.success('Invite revoked');
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not revoke');
      } finally {
        setBusy(false);
      }
    },
    [businessId, load]
  );

  const now = Date.now();

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Client portal links</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Read-only project view for customers. Each link uses a random token (stored hashed). Links expire in 14 days by
        default; revoke anytime. Security follows the same credentials as the rest of the app — see portal
        contract doc.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[8rem]">
          <AppInputLabeled
            label="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. ACME review"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createInvite()}
          className="min-h-10 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Create link'}
        </button>
        {lastCreatedUrl != null && (
          <a
            href={`mailto:?subject=${encodeURIComponent(`Project view: ${projectName}`)}&body=${encodeURIComponent(`View the shared project timeline:\n\n${lastCreatedUrl}\n\nThis link expires in 14 days unless revoked.`)}`}
            className="min-h-10 inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 no-underline"
          >
            Email link (mailto)
          </a>
        )}
      </div>
      {lastCreatedUrl != null && (
        <p className="text-[10px] text-slate-500 dark:text-slate-500 break-all">
          Last created link is only shown until you leave this page — copy or email it now.
        </p>
      )}
      {loading ? (
        <p className="text-sm text-slate-500">Loading invites…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No invites for {projectName}.</p>
      ) : (
        <ul className="text-sm space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
          {rows.map((r) => {
            const expired = new Date(r.expires_at).getTime() <= now;
            const revoked = r.revoked_at != null;
            const dead = expired || revoked;
            return (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 text-slate-700 dark:text-slate-200">
                <div>
                  <div className="font-medium">{r.label?.trim() || `Invite #${r.id}`}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Expires {formatExpiry(r.expires_at)}
                    {revoked && ' · Revoked'}
                    {!revoked && expired && ' · Expired'}
                  </div>
                </div>
                {r.id != null && !revoked && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void revoke(r.id!)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
                {dead && !revoked && <span className="text-xs text-slate-400">Inactive</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
