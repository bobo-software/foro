import { foroApiClient } from '@/backend';
import type {
  CreateInviteInput,
  InviteAcceptanceResult,
  InvitePreview,
  TeamInvite,
  TeamMembership,
} from '@/types/team';

const INVITES_BASE = '/api/v1/team-invites';
const MEMBERSHIPS_BASE = '/api/v1/team-memberships';

interface ApiTeamInviteRow {
  id: number;
  businessId: number;
  emailNormalized: string;
  roleKey: string;
  status: string;
  expiresAt: string;
  invitedByUserId: number | null;
  acceptedByUserId: number | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ApiTeamMembershipRow {
  id: number;
  userId: number;
  businessId: number;
  roleKey: string;
  status: string;
  invitedViaInviteId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApiInvite(row: ApiTeamInviteRow): TeamInvite {
  return {
    id: row.id,
    business_id: row.businessId,
    email_normalized: row.emailNormalized,
    role_key: row.roleKey,
    status: row.status as TeamInvite['status'],
    expires_at: row.expiresAt,
    invited_by_user_id: row.invitedByUserId ?? undefined,
    accepted_by_user_id: row.acceptedByUserId,
    accepted_at: row.acceptedAt,
    revoked_at: row.revokedAt,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function fromApiMembership(row: ApiTeamMembershipRow): TeamMembership {
  return {
    id: row.id,
    user_id: row.userId,
    business_id: row.businessId,
    role_key: row.roleKey,
    status: row.status as TeamMembership['status'],
    invited_via_invite_id: row.invitedViaInviteId,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

class TeamService {
  /** Server generates the invite-link token; returns it once so the caller can share it. */
  async createInvite(input: CreateInviteInput): Promise<TeamInvite & { token?: string }> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 23)
      .replace('T', ' ');
    const response = await foroApiClient.post<ApiTeamInviteRow & { token?: string }>(INVITES_BASE, {
      businessId: input.business_id,
      emailNormalized: normalizeEmail(input.email),
      roleKey: input.role_key,
      expiresAt,
    });
    return { ...fromApiInvite(response.data), token: response.data.token };
  }

  async listInvites(businessId: number): Promise<TeamInvite[]> {
    const response = await foroApiClient.get<ApiTeamInviteRow[]>(INVITES_BASE, {
      businessId,
      limit: 200,
    });
    return (response.data ?? []).map(fromApiInvite);
  }

  async revokeInvite(inviteId: number): Promise<void> {
    await foroApiClient.post(`${INVITES_BASE}/${inviteId}/revoke`, {});
  }

  async resendInvite(inviteId: number): Promise<void> {
    await foroApiClient.post(`${INVITES_BASE}/${inviteId}/resend`, {});
  }

  /**
   * Public — no auth required, used by the pre-signup invite-link preview page.
   * NOTE: `token` here is the opaque link token (see `createInvite`'s returned
   * `token`), not a numeric invite id — foro-api's team_invites table has no
   * separate "invite id in URL" flow, only token-based lookup for anonymous preview.
   */
  async previewInvite(token: string): Promise<InvitePreview> {
    const response = await foroApiClient.get<InvitePreview>(`${INVITES_BASE}/by-token/${token}/preview`);
    return response.data;
  }

  async acceptInvite(token: string): Promise<InviteAcceptanceResult> {
    const response = await foroApiClient.post<InviteAcceptanceResult>(
      `${INVITES_BASE}/by-token/${token}/accept`,
      {}
    );
    return response.data;
  }

  /**
   * Creates the 'owner' membership row for a newly-created owner company.
   * NOTE: `POST /api/v1/companies` already auto-provisions this server-side
   * (see foro-api CompanyRoutes) — this method is now a no-op safety net kept
   * for callers that still invoke it explicitly after createOwnerCompany().
   */
  async createOwnerMembership(userId: number, businessId: number): Promise<TeamMembership | null> {
    const existing = await this.listMembers(businessId);
    const already = existing.find((m) => m.user_id === userId && m.role_key === 'owner');
    if (already) return already;
    // Membership already exists from the company-creation bootstrap in almost
    // all cases; if it somehow doesn't, there is no client-callable endpoint
    // to force-create an owner membership out of band (POST /team-memberships
    // itself requires an existing owner/admin membership to authorize the
    // write) — surface null rather than silently failing.
    return null;
  }

  async listMembers(businessId: number): Promise<TeamMembership[]> {
    const response = await foroApiClient.get<ApiTeamMembershipRow[]>(MEMBERSHIPS_BASE, {
      businessId,
      limit: 500,
    });
    return (response.data ?? []).map(fromApiMembership);
  }

  async updateMemberRole(membershipId: number, roleKey: string): Promise<void> {
    await foroApiClient.put(`${MEMBERSHIPS_BASE}/${membershipId}/role`, { roleKey });
  }

  async removeMember(membershipId: number): Promise<void> {
    await foroApiClient.delete(`${MEMBERSHIPS_BASE}/${membershipId}`);
  }
}

export const teamService = new TeamService();
