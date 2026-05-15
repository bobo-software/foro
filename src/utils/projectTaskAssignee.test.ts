import { describe, it, expect } from 'vitest';
import { activeMemberUserIds, isAssignableUserId } from './projectTaskAssignee';
import type { TeamMembership } from '@/types/team';

const members: TeamMembership[] = [
  { id: 1, user_id: 10, business_id: 1, role_key: 'owner', status: 'active' },
  { id: 2, user_id: 20, business_id: 1, role_key: 'member', status: 'active' },
  { id: 3, user_id: 99, business_id: 1, role_key: 'member', status: 'removed' },
];

describe('activeMemberUserIds', () => {
  it('includes only active members', () => {
    expect(activeMemberUserIds(members)).toEqual(new Set([10, 20]));
  });
});

describe('isAssignableUserId', () => {
  it('allows unassigned', () => {
    expect(isAssignableUserId(null, members)).toBe(true);
    expect(isAssignableUserId(undefined, members)).toBe(true);
  });

  it('allows active member ids', () => {
    expect(isAssignableUserId(10, members)).toBe(true);
    expect(isAssignableUserId(20, members)).toBe(true);
  });

  it('rejects removed or unknown ids', () => {
    expect(isAssignableUserId(99, members)).toBe(false);
    expect(isAssignableUserId(0, members)).toBe(false);
    expect(isAssignableUserId(12345, members)).toBe(false);
  });
});
