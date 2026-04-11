import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LuLayoutDashboard,
  LuBuilding2,
  LuPackage,
  LuFileText,
  LuWallet,
  LuSettings,
} from 'react-icons/lu';
import AppText from '@/components/text/AppText';
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

  const navLink = (to: string, label: string, icon: React.ReactNode, exact?: boolean) => {
    const isActive = exact
      ? location.pathname === to
      : (location.pathname === to || location.pathname.startsWith(to + '/'));
    const activeCls = isDark
      ? 'bg-indigo-500/25 text-indigo-200'
      : 'bg-indigo-600/15 text-indigo-800';
    const inactiveCls = isDark
      ? 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
      : 'text-slate-500 hover:bg-slate-300/70 hover:text-slate-800';
    return (
      <Link
        to={to}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? activeCls : inactiveCls}`}
      >
        <span className="w-4 h-4 shrink-0">{icon}</span>
        {label}
      </Link>
    );
  };

  const sidebarBg = isDark ? 'bg-slate-800' : 'bg-slate-100 dark:bg-slate-800';
  const borderCls = isDark ? 'border-white/10' : 'border-slate-200 dark:border-white/10';
  const logoCls = isDark ? 'text-white' : 'text-slate-900 dark:text-white';

  return (
    <aside
      className={`w-[220px] min-w-[220px] flex flex-col shrink-0 print:hidden ${sidebarBg} text-slate-800 dark:text-slate-200 ${isDark ? 'dark' : ''}`}
    >
      <div className={`px-4 py-3 border-b ${borderCls}`}>
        <Link
          to="/app/dashboard"
          className={`flex items-center gap-2 no-underline ${logoCls}`}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={businessName} className="h-7 w-7 rounded-md object-contain shrink-0" />
          ) : (
            <img src="/favicon.png" alt="" className="h-7 w-7 rounded-md object-contain shrink-0" />
          )}
          <AppText variant="brand">{businessName}</AppText>
        </Link>
      </div>
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {navLink('/app/dashboard', 'Dashboard', <LuLayoutDashboard className="w-4 h-4" />)}
        {navLink('/app/companies', 'Companies', <LuBuilding2 className="w-4 h-4" />)}
        {navLink('/app/items', 'Stock', <LuPackage className="w-4 h-4" />)}
        {navLink('/app/quotations', 'Quotations', <LuFileText className="w-4 h-4" />)}
        {navLink('/app/payments', 'Payments', <LuWallet className="w-4 h-4" />)}
      </nav>
      <div className={`px-2 py-3 border-t ${borderCls}`}>
        {navLink('/app/settings', 'Settings', <LuSettings className="w-4 h-4" />)}
      </div>
    </aside>
  );
}

export default AppSidebar;
