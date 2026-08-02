import { foroApiClient } from '../backend';
import type { PortalInvite, PortalInviteSummary } from '../types/portalInvite';
import { sha256Hex } from '../utils/sha256Hex';

const BASE = '/api/v1/portal-invites';

interface ApiRow {
  id: number;
  businessId: number;
  projectId: number;
  tokenHash: string;
  label: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiRow): PortalInvite {
  return {
    id: row.id,
    business_id: row.businessId,
    project_id: row.projectId,
    token_hash: row.tokenHash,
    label: row.label,
    expires_at: row.expiresAt,
    revoked_at: row.revokedAt,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function generatePlaintextToken(): string {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  const hex = [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `fp_${hex}`;
}

export class PortalInviteService {
  /** Lookup by SHA-256 hex of the URL token (64 chars). */
  static async findActiveByTokenHash(tokenHash: string): Promise<PortalInvite | null> {
    const response = await foroApiClient.get<ApiRow[]>(BASE, { limit: 500 });
    const now = Date.now();
    for (const raw of response.data ?? []) {
      const inv = fromApi(raw);
      if (inv.token_hash !== tokenHash) continue;
      if (inv.revoked_at) continue;
      const ex = new Date(inv.expires_at).getTime();
      if (Number.isFinite(ex) && ex > now) return inv;
    }
    return null;
  }

  static async findByProject(projectId: number, businessId: number): Promise<PortalInviteSummary[]> {
    const response = await foroApiClient.get<ApiRow[]>(BASE, { projectId, businessId, limit: 100 });
    return (response.data ?? [])
      .map(fromApi)
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
      .map(({ token_hash: _t, ...rest }) => rest);
  }

  /** Returns plaintext token once; caller must show/copy it — it cannot be recovered later. */
  static async createInvite(params: {
    business_id: number;
    project_id: number;
    label?: string | null;
    expiresAt: Date;
  }): Promise<{ plaintextToken: string; summary: PortalInviteSummary }> {
    const plaintextToken = generatePlaintextToken();
    const tokenHash = await sha256Hex(plaintextToken);
    const response = await foroApiClient.post<ApiRow>(BASE, {
      businessId: params.business_id,
      projectId: params.project_id,
      tokenHash,
      label: params.label ?? null,
      expiresAt: params.expiresAt.toISOString().slice(0, 23).replace('T', ' '),
    });
    const inv = fromApi(response.data);
    const { token_hash: _t, ...summary } = inv;
    return { plaintextToken, summary };
  }

  static async revoke(id: number, businessId: number): Promise<{ rowCount: number }> {
    void businessId;
    const ts = new Date().toISOString().slice(0, 23).replace('T', ' ');
    const response = await foroApiClient.put<ApiRow>(`${BASE}/${id}`, { revokedAt: ts });
    return { rowCount: response.data ? 1 : 0 };
  }
}

export default PortalInviteService;
