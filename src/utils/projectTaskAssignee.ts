import type { TeamMembership } from '@/types/team';

/** Active `team_memberships` rows for the current business. */
export function activeMemberUserIds(members: TeamMembership[]): Set<number> {
  return new Set(
    members.filter((m) => m.status === 'active').map((m) => Number(m.user_id)).filter((id) => Number.isFinite(id))
  );
}

/** `null` / `undefined` means unassign (allowed). Otherwise `user_id` must be an active member. */
export function isAssignableUserId(
  userId: number | null | undefined,
  members: TeamMembership[]
): boolean {
  if (userId == null) return true;
  const n = Number(userId);
  if (!Number.isFinite(n) || n <= 0) return false;
  return activeMemberUserIds(members).has(n);
}
