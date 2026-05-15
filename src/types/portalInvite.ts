/**
 * Row in `portal_invites`.
 * @see docs/03-database/portal-invites-schema-contract.md
 */
export interface PortalInvite {
  id?: number;
  business_id: number;
  project_id: number;
  token_hash: string;
  label?: string | null;
  expires_at: string;
  revoked_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Invite row without secret material (for internal lists). */
export type PortalInviteSummary = Omit<PortalInvite, 'token_hash'>;
