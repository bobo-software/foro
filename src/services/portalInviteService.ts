import { skaftinClient } from '../backend';
import type { PortalInvite, PortalInviteSummary } from '../types/portalInvite';
import { sha256Hex } from '../utils/sha256Hex';

const TABLE_NAME = 'portal_invites';

function normalizeRows<T>(response: unknown): T[] {
  const r = response as Record<string, unknown>;
  if (Array.isArray(r?.data)) return r.data as T[];
  if (Array.isArray(r?.rows)) return r.rows as T[];
  if (Array.isArray(r)) return r as T[];
  return [];
}

function normalizeInvite(raw: Record<string, unknown>): PortalInvite {
  return {
    id: raw.id != null ? Number(raw.id) : undefined,
    business_id: Number(raw.business_id),
    project_id: Number(raw.project_id),
    token_hash: String(raw.token_hash ?? ''),
    label: raw.label != null ? String(raw.label) : undefined,
    expires_at: String(raw.expires_at ?? ''),
    revoked_at: raw.revoked_at != null ? String(raw.revoked_at) : null,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
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
    const response = await skaftinClient.post(`/app-api/database/tables/${TABLE_NAME}/select`, {
      where: { token_hash: tokenHash },
      limit: 5,
      offset: 0,
    });
    const rows = normalizeRows<Record<string, unknown>>(response);
    const now = Date.now();
    for (const raw of rows) {
      const inv = normalizeInvite(raw);
      if (inv.revoked_at) continue;
      const ex = new Date(inv.expires_at).getTime();
      if (Number.isFinite(ex) && ex > now) return inv;
    }
    return null;
  }

  static async findByProject(projectId: number, businessId: number): Promise<PortalInviteSummary[]> {
    const response = await skaftinClient.post(`/app-api/database/tables/${TABLE_NAME}/select`, {
      where: { project_id: projectId, business_id: businessId },
      orderBy: 'id',
      orderDirection: 'DESC',
      limit: 100,
      offset: 0,
    });
    return normalizeRows<Record<string, unknown>>(response).map((raw) => {
      const inv = normalizeInvite(raw);
      const { token_hash: _t, ...rest } = inv;
      return rest;
    });
  }

  /** Returns plaintext token once; caller must show/copy it — it cannot be recovered later. */
  static async createInvite(params: {
    business_id: number;
    project_id: number;
    label?: string | null;
    expiresAt: Date;
  }): Promise<{ plaintextToken: string; summary: PortalInviteSummary }> {
    const plaintextToken = generatePlaintextToken();
    const token_hash = await sha256Hex(plaintextToken);
    const data = {
      business_id: params.business_id,
      project_id: params.project_id,
      token_hash,
      label: params.label ?? null,
      expires_at: params.expiresAt.toISOString(),
    };
    const response = await skaftinClient.post(`/app-api/database/tables/${TABLE_NAME}/insert`, { data });
    const r = response as unknown as Record<string, unknown>;
    const inserted = (Array.isArray(r?.data) ? r?.data?.[0] : r?.data) ?? r;
    const inv = normalizeInvite(inserted as Record<string, unknown>);
    const { token_hash: _t, ...summary } = inv;
    return { plaintextToken, summary };
  }

  static async revoke(id: number, businessId: number): Promise<{ rowCount: number }> {
    const ts = new Date().toISOString();
    const response = await skaftinClient.put(`/app-api/database/tables/${TABLE_NAME}/update`, {
      where: { id, business_id: businessId },
      data: { revoked_at: ts, updated_at: ts },
    });
    const r = response as unknown as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }
}

export default PortalInviteService;
