import { useEffect } from 'react';
import useAuthStore from '../stores/data/AuthStore';
import { useTeamStore } from '../stores/data/TeamStore';
import { useBusinessStore } from '../stores/data/BusinessStore';

export interface BusinessOwnerCheck {
  isOwner: boolean;
  /** True while the underlying team-membership fetch is in flight. */
  isLoading: boolean;
}

/**
 * Resolves whether the current session user owns the given business.
 *
 * Primary source: TeamMembership.role_key === 'owner'. This is distinct from
 * AuthStore's hasRole()/isAdmin(), which check a legacy, business-agnostic
 * global role — not per-business ownership.
 *
 * Fallback: companies.user_id === current user, for the owner company row
 * itself (is_owner_company=true). Onboard.tsx historically only wrote this
 * column and never created a matching team_memberships row, so businesses
 * created before that was fixed have no 'owner' membership at all — without
 * this fallback their real owner would be locked out of Settings → Billing.
 */
export function useIsBusinessOwner(businessId: number | null | undefined): BusinessOwnerCheck {
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const members = useTeamStore((s) => s.members);
  const isLoading = useTeamStore((s) => s.isLoading);
  const fetchMembers = useTeamStore((s) => s.fetchMembers);
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  useEffect(() => {
    if (businessId != null) {
      void fetchMembers(businessId);
    }
  }, [businessId, fetchMembers]);

  if (businessId == null || !sessionUser?.id) return { isOwner: false, isLoading };

  const userId = Number(sessionUser.id);
  const myMembership = members.find(
    (m) => m.business_id === businessId && m.user_id === userId && m.status === 'active'
  );
  if (myMembership) return { isOwner: myMembership.role_key === 'owner', isLoading };

  const isOwnerCompanyUser =
    currentBusiness?.id === businessId && Number(currentBusiness?.user_id) === userId;
  return { isOwner: isOwnerCompanyUser, isLoading };
}

export default useIsBusinessOwner;
