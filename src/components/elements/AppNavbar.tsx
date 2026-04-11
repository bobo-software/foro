import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/data/AuthStore';
import useThemeStore from '../../stores/state/ThemeStore';
import AppProfileComponent from './AppProfileComponent';
import { ConnectionDot } from './ConnectionStatus';

function useBreadcrumbs() {
  const location = useLocation();
  const path = location.pathname;

  if (path === '/app' || path === '/app/' || path === '/app/dashboard') {
    return [{ label: 'Dashboard', path: '/app/dashboard' }];
  }

  const segments = path.replace(/^\/app\/?/, '').split('/').filter(Boolean);
  const crumbs: { label: string; path: string }[] = [{ label: 'Dashboard', path: '/app/dashboard' }];

  let acc = '/app';
  for (let i = 0; i < segments.length; i++) {
    acc += `/${segments[i]}`;
    const segment = segments[i];
    const label =
      segment === 'dashboard' ? 'Dashboard' :
      segment === 'invoices' ? 'Invoices' :
      segment === 'companies' ? 'Companies' :
      segment === 'items' ? 'Stock' :
      segment === 'quotations' ? 'Quotations' :
      segment === 'payments' ? 'Payments' :
      segment === 'statements' ? 'Statements' :
      segment === 'settings' ? 'Settings' :
      segment === 'business' ? 'Business' :
      segment === 'profile' ? 'Profile' :
      segment === 'preferences' ? 'Preferences' :
      segment === 'create' ? 'New' :
      segment === 'edit' ? 'Edit' :
      /^\d+$/.test(segment) ? `#${segment}` :
      segment;
    crumbs.push({ label, path: acc });
  }

  return crumbs;
}

const AppNavbar = () => {
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const theme = useThemeStore((s) => s.theme);
  const breadcrumbs = useBreadcrumbs();

  // Sync theme to document.documentElement (admin pages only).
  // Cleanup on unmount removes dark when navigating to landing/auth.
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, [theme]);

  const companyName = sessionUser?.association_name || sessionUser?.name || 'My Company';

  return (
    <header className="shrink-0 flex items-center justify-between gap-4 px-6 py-3 print:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {companyName}
        </span>
        <nav className="flex items-center flex-wrap gap-1 text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="inline-flex items-center gap-1">
              {i > 0 && <span className="text-slate-300 dark:text-slate-600 select-none">/</span>}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-slate-800 dark:text-slate-100">{crumb.label}</span>
              ) : (
                <Link
                  to={crumb.path}
                  className="text-indigo-600 dark:text-indigo-400 no-underline hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <input
            type="search"
            placeholder="Search…"
            className="w-48 pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-shadow bg-size-[1rem_1rem] bg-position-[0.5rem_center] bg-no-repeat"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z'/%3E%3C/svg%3E")`,
            }}
            aria-label="Search"
          />
        </div>
        <ConnectionDot className="shrink-0" />
        <AppProfileComponent />
      </div>
    </header>
  );
}

export default AppNavbar;