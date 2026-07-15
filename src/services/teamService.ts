import { skaftinClient } from '@/backend';
import type {
  CreateInviteInput,
  InviteAcceptanceResult,
  InvitePreview,
  TeamInvite,
  TeamMembership,
} from '@/types/team';

const TEAM_BASE = '/app-api/teams';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

class TeamService {
  async createInvite(input: CreateInviteInput): Promise<TeamInvite> {
    const response = await skaftinClient.post<TeamInvite>(`${TEAM_BASE}/invites`, {
      business_id: input.business_id,
      email: normalizeEmail(input.email),
      role_key: input.role_key,
    });
    return response.data;
  }

  async listInvites(businessId: number): Promise<TeamInvite[]> {
    const response = await skaftinClient.post<{ rows?: TeamInvite[] } | TeamInvite[]>(
      '/app-api/database/tables/team_invites/select',
      {
        where: { business_id: businessId },
        orderBy: 'created_at',
        orderDirection: 'DESC',
        limit: 200,
        offset: 0,
      }
    );
    const data = response.data;
    return Array.isArray(data) ? data : (data.rows ?? []);
  }

  async revokeInvite(inviteId: number): Promise<void> {
    await skaftinClient.post(`${TEAM_BASE}/invites/${inviteId}/revoke`, {});
  }

  async resendInvite(inviteId: number): Promise<void> {
    await skaftinClient.post(`${TEAM_BASE}/invites/${inviteId}/resend`, {});
  }

  async previewInvite(token: string): Promise<InvitePreview> {
    const response = await skaftinClient.get<InvitePreview>(`${TEAM_BASE}/invites/${token}/preview`);
    return response.data;
  }

  async acceptInvite(token: string): Promise<InviteAcceptanceResult> {
    const response = await skaftinClient.post<InviteAcceptanceResult>(
      `${TEAM_BASE}/invites/${token}/accept`,
      {}
    );
    return response.data;
  }

  /**
   * Creates the 'owner' membership row for a newly-created owner company.
   * Onboard.tsx historically only set companies.user_id/is_owner_company and
   * never wrote this row — call it right after createOwnerCompany() so every
   * new business has one going forward.
   */
  async createOwnerMembership(userId: number, businessId: number): Promise<TeamMembership> {
    const response = await skaftinClient.post<{ data?: TeamMembership } | TeamMembership>(
      '/app-api/database/tables/team_memberships/insert',
      { data: { user_id: userId, business_id: businessId, role_key: 'owner', status: 'active' } }
    );
    const data = response.data;
    return (data as { data?: TeamMembership })?.data ?? (data as TeamMembership);
  }

  async listMembers(businessId: number): Promise<TeamMembership[]> {
    const response = await skaftinClient.post<{ rows?: TeamMembership[] } | TeamMembership[]>(
      '/app-api/database/tables/team_memberships/select',
      {
        where: { business_id: businessId },
        orderBy: 'created_at',
        orderDirection: 'DESC',
        limit: 500,
        offset: 0,
      }
    );
    const data = response.data;
    return Array.isArray(data) ? data : (data.rows ?? []);
  }

  async updateMemberRole(membershipId: number, roleKey: string): Promise<void> {
    await skaftinClient.patch(`${TEAM_BASE}/members/${membershipId}/role`, {
      role_key: roleKey,
    });
  }

  async removeMember(membershipId: number): Promise<void> {
    await skaftinClient.delete(`${TEAM_BASE}/members/${membershipId}`);
  }
}

export const teamService = new TeamService();
