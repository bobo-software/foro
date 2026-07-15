import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '@/stores/data/AuthStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';

const SETTINGS_TABS = [
  { to: '/app/settings', label: 'Company', exact: true },
  { to: '/app/settings/banking', label: 'Banking', exact: false },
  { to: '/app/settings/documents', label: 'Documents', exact: false },
  { to: '/app/settings/preferences', label: 'Preferences', exact: false },
  { to: '/app/settings/team', label: 'Team', exact: false },
  { to: '/app/settings/billing', label: 'Billing', exact: false },
];

export function SettingsPage() {
  const location = useLocation();
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businesses = useBusinessStore((s) => s.businesses);
  const businessLoading = useBusinessStore((s) => s.loading);
  const fetchUserBusinesses = useBusinessStore((s) => s.fetchUserBusinesses);
  const [fetchedForUserId, setFetchedForUserId] = useState<number | null>(null);
  const userId = sessionUser?.id != null ? Number(sessionUser.id) : null;

  useEffect(() => {
    if (currentBusiness && userId != null && fetchedForUserId !== userId) {
      setFetchedForUserId(userId);
    }
  }, [currentBusiness, userId, fetchedForUserId]);

  useEffect(() => {
    if (userId == null || businessLoading || fetchedForUserId === userId) {
      return;
    }

    setFetchedForUserId(userId);
    fetchUserBusinesses(userId);
  }, [userId, businessLoading, fetchedForUserId, fetchUserBusinesses]);

  const showRegisterCompanyPrompt =
    userId != null &&
    fetchedForUserId === userId &&
    !businessLoading &&
    !currentBusiness &&
    businesses.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Manage your company and preferences.</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {SETTINGS_TABS.map((tab) => {
          const isActive = tab.exact
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors no-underline ${
                isActive
                  ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-b-white dark:border-b-slate-800 -mb-px text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {showRegisterCompanyPrompt ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Register Your Company
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            We could not find a company linked to your account. Register your company to manage
            banking, documents, and preferences.
          </p>
          <div className="mt-4">
            <Link
              to="/onboard"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
            >
              Register company
            </Link>
          </div>
        </div>
      ) : (
      <Outlet />
      )}
    </div>
  );
}
