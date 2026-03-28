import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useThemeStore from '../../stores/state/ThemeStore';
import { useBusinessStore } from '../../stores/data/BusinessStore';
import StorageService from '../../services/storageService';

const AppSidebar = () => {
  const location = useLocation();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (currentBusiness?.logo_url) {
      StorageService.getFileDownloadUrl(currentBusiness.logo_url)
        .then((url) => setLogoUrl(url))
        .catch(() => setLogoUrl(null));
    } else {
      setLogoUrl(null);
    }
  }, [currentBusiness?.logo_url]);

  const businessName = currentBusiness?.name || 'Foroman';

  const navLink = (to: string, label: string, exact?: boolean) => {
    const isActive = exact
      ? location.pathname === to
      : (location.pathname === to || location.pathname.startsWith(to + '/'));
    const activeCls = isDark
      ? 'bg-indigo-500/25 text-indigo-200'
      : 'bg-indigo-600/20 text-indigo-800';
    const inactiveCls = isDark
      ? 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
      : 'text-slate-600 hover:bg-slate-300 hover:text-slate-900';
    return (
      <Link
        to={to}
        className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? activeCls : inactiveCls}`}
      >
        {label}
      </Link>
    );
  };

  const sidebarBg = isDark ? 'bg-slate-800' : 'bg-slate-200 dark:bg-slate-800';
  const borderCls = isDark ? 'border-white/10' : 'border-slate-300 dark:border-white/10';
  const logoCls = isDark ? 'text-white' : 'text-slate-900 dark:text-white';

  return (
    <aside className={`w-[260px] min-w-[260px] flex flex-col shrink-0 ${sidebarBg} text-slate-800 dark:text-slate-200 ${isDark ? 'dark' : ''}`}>
      <div className={`px-5 py-4 border-b ${borderCls}`}>
        <Link
          to="/app/dashboard"
          className={`flex items-center gap-2.5 no-underline ${logoCls}`}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={businessName} className="h-8 w-8 rounded-lg object-contain shrink-0" />
          ) : (
            <img src="/favicon.png" alt="" className="h-8 w-8 rounded-lg object-contain shrink-0" />
          )}
          <span className="text-xl font-bold tracking-tight truncate">{businessName}</span>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navLink('/app/dashboard', 'Dashboard')}
        {navLink('/app/companies', 'Companies')}
        {navLink('/app/items', 'Stock')}
        {navLink('/app/quotations', 'Quotations')}
        {navLink('/app/payments', 'Payments')}
        {navLink('/app/statements', 'Statements')}
      </nav>
      <div className={`px-3 py-4 border-t ${borderCls} space-y-1`}>
        {navLink('/app/settings', 'Settings')}
      </div>
    </aside>
  );
}

export default AppSidebar;
