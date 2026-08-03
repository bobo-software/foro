import type { SubscriptionTier } from '@/types/subscription';

export interface PricingTierFeature {
  label: string;
  included: boolean;
}

export interface PricingTierLimits {
  /** Max client companies (companies with is_owner_company=false) per business. */
  companies: number;
  /** Max active team memberships per business. */
  teamMembers: number;
}

export interface PricingTier {
  id: SubscriptionTier;
  name: string;
  price: string;
  amount: number;
  period: string;
  description: string;
  highlight: boolean;
  badge: string | null;
  limits: PricingTierLimits;
  features: PricingTierFeature[];
  /** Paystack plan code — set once the plan is created/synced with the payment provider. Free has none. */
  planCode?: string;
  /** Payment provider id the plan belongs to (when billing is configured). */
  providerId?: number;
}

function buildFeatures(limits: PricingTierLimits, rest: PricingTierFeature[]): PricingTierFeature[] {
  return [
    { label: `${limits.companies} companies`, included: true },
    { label: `${limits.teamMembers} team members`, included: true },
    ...rest,
  ];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'R0',
    amount: 0,
    period: '/mo',
    description: 'Get started at no cost. No credit card required.',
    highlight: false,
    badge: null,
    limits: { companies: 7, teamMembers: 2 },
    features: buildFeatures({ companies: 7, teamMembers: 2 }, [
      { label: 'Quotations & invoices', included: true },
      { label: 'Payments & statements', included: true },
      { label: 'PDF downloads', included: true },
      { label: 'Items catalog', included: true },
      { label: 'Project tasks (list view)', included: true },
      { label: 'Time tracking', included: false },
      { label: 'Custom branding', included: false },
      { label: 'Client portal', included: false },
      { label: 'Priority support', included: false },
    ]),
  },
  {
    id: 'bronze',
    name: 'Bronze',
    price: 'R149',
    amount: 149,
    period: '/mo',
    description: 'For growing small businesses.',
    highlight: false,
    badge: null,
    limits: { companies: 10, teamMembers: 5 },
    features: buildFeatures({ companies: 10, teamMembers: 5 }, [
      { label: 'Quotations & invoices', included: true },
      { label: 'Payments & statements', included: true },
      { label: 'PDF downloads', included: true },
      { label: 'Items catalog', included: true },
      { label: 'Kanban & timeline views', included: true },
      { label: 'Time tracking & budgets', included: true },
      { label: 'Custom branding', included: true },
      { label: 'Client portal', included: false },
      { label: 'Priority support', included: false },
    ]),
    planCode: 'PLN_edbry63aywhyi08',
    providerId: 1,
  },
  {
    id: 'silver',
    name: 'Silver',
    price: 'R249',
    amount: 249,
    period: '/mo',
    description: 'For teams managing more clients.',
    highlight: true,
    badge: 'Most popular',
    limits: { companies: 18, teamMembers: 10 },
    features: buildFeatures({ companies: 18, teamMembers: 10 }, [
      { label: 'Quotations & invoices', included: true },
      { label: 'Payments & statements', included: true },
      { label: 'Kanban & timeline views', included: true },
      { label: 'Time tracking & budgets', included: true },
      { label: 'Custom branding', included: true },
      { label: 'Client portal', included: true },
      { label: 'Project automation', included: true },
      { label: 'Priority support', included: true },
      { label: 'Bulk operations', included: true },
    ]),
    planCode: 'PLN_jcgk9rclblm91m5',
    providerId: 1,
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 'R399',
    amount: 399,
    period: '/mo',
    description: 'Full power for larger operations.',
    highlight: false,
    badge: null,
    limits: { companies: 25, teamMembers: 15 },
    features: buildFeatures({ companies: 25, teamMembers: 15 }, [
      { label: 'Quotations & invoices', included: true },
      { label: 'Payments & statements', included: true },
      { label: 'Kanban & timeline views', included: true },
      { label: 'Time tracking & budgets', included: true },
      { label: 'Custom branding', included: true },
      { label: 'Client portal', included: true },
      { label: 'Project automation', included: true },
      { label: 'Priority support', included: true },
      { label: 'Bulk operations', included: true },
      { label: 'API access', included: true },
    ]),
    planCode: 'PLN_1l4or6hfzzvmf3y',
    providerId: 1,
  },
];

export function getPricingTier(id: SubscriptionTier): PricingTier {
  const tier = PRICING_TIERS.find((t) => t.id === id);
  if (!tier) throw new Error(`Unknown pricing tier: ${id}`);
  return tier;
}
