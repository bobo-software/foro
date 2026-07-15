import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useTeamStore } from '@/stores/data/TeamStore';
import { useSubscriptionLimits } from '@/hooks';

const inviteSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

const ROLE_OPTIONS = ['owner', 'admin', 'member', 'viewer'];

export function TeamSettingsTab() {
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const invites = useTeamStore((s) => s.invites);
  const members = useTeamStore((s) => s.members);
  const isLoading = useTeamStore((s) => s.isLoading);
  const error = useTeamStore((s) => s.error);
  const fetchInvites = useTeamStore((s) => s.fetchInvites);
  const fetchMembers = useTeamStore((s) => s.fetchMembers);
  const createInvite = useTeamStore((s) => s.createInvite);
  const revokeInvite = useTeamStore((s) => s.revokeInvite);
  const resendInvite = useTeamStore((s) => s.resendInvite);
  const updateMemberRole = useTeamStore((s) => s.updateMemberRole);
  const removeMember = useTeamStore((s) => s.removeMember);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  const businessId = currentBusiness?.id;

  useEffect(() => {
    if (!businessId) return;
    void fetchInvites(businessId);
    void fetchMembers(businessId);
  }, [businessId, fetchInvites, fetchMembers]);

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === 'pending' || invite.status === 'sent'),
    [invites]
  );

  const { limits } = useSubscriptionLimits();
  const activeMemberCount = useMemo(
    () => members.filter((m) => m.status === 'active').length,
    [members]
  );
  // Count outstanding invites too, so a business can't invite past its cap
  // and land over the limit the moment they're all accepted.
  const seatsUsed = activeMemberCount + pendingInvites.length;
  const atMemberLimit = seatsUsed >= limits.teamMembers;

  const handleInviteSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!businessId) return;
    const validation = inviteSchema.safeParse({ email: inviteEmail.trim() });
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Please provide a valid email');
      return;
    }
    if (atMemberLimit) {
      toast.error(`Your plan is limited to ${limits.teamMembers} team members — upgrade in Settings → Billing to invite more.`);
      return;
    }
    const created = await createInvite({
      email: inviteEmail.trim(),
      role_key: inviteRole,
      business_id: businessId,
    });
    if (!created) return;
    toast.success('Invitation created');
    setInviteEmail('');
    setInviteRole('member');
    await fetchInvites(businessId);
  };

  if (!currentBusiness) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Select a business to manage team members.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Invite team member</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Send an invite email with role access to {currentBusiness.name}.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {seatsUsed} of {limits.teamMembers} team seats used on your plan.
        </p>
        <form onSubmit={handleInviteSubmit} className="mt-4 flex flex-wrap gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="teammate@example.com"
            disabled={atMemberLimit}
            className="min-w-[240px] flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm disabled:opacity-50"
          />
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value)}
            disabled={atMemberLimit}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm disabled:opacity-50"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isLoading || atMemberLimit}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send invite
          </button>
        </form>
        {atMemberLimit && (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
            Your plan is limited to {limits.teamMembers} team members.{' '}
            <Link to="/app/settings/billing" className="underline">
              Upgrade to invite more
            </Link>
            .
          </p>
        )}
        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pending invites</h2>
        <div className="mt-4 space-y-2">
          {pendingInvites.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">No pending invites.</p>
          )}
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {invite.email_normalized}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Role: {invite.role_key} • Expires {new Date(invite.expires_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void resendInvite(invite.id)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Resend
                </button>
                <button
                  type="button"
                  onClick={() => businessId && void revokeInvite(invite.id, businessId)}
                  className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Team members</h2>
        <div className="mt-4 space-y-2">
          {members.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">No members found for this business.</p>
          )}
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  User #{member.user_id}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Status: {member.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={member.role_key}
                  onChange={(event) =>
                    businessId &&
                    void updateMemberRole(member.id, event.target.value, businessId)
                  }
                  className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => businessId && void removeMember(member.id, businessId)}
                  className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
