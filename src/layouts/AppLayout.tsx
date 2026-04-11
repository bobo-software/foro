import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar, AppNavbar } from '../components/ComponentsIndex';
import useAuthStore from '../stores/data/AuthStore';
import { useBusinessStore } from '../stores/data/BusinessStore';
import useThemeStore from '../stores/state/ThemeStore';

export function AppLayout() {
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const fetchUserBusinesses = useBusinessStore((s) => s.fetchUserBusinesses);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (sessionUser?.id != null) {
      fetchUserBusinesses(Number(sessionUser.id));
    }
  }, [sessionUser?.id, fetchUserBusinesses]);

  return (
    <div
      className={`flex h-screen print:h-auto print:min-h-0 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 print:bg-white ${isDark ? 'dark' : ''}`}
      data-theme={theme}
    >
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden print:overflow-visible">
        <AppNavbar />
        <main
          id="main-content"
          className="flex-1 min-h-0 p-6 overflow-auto print:p-0 print:overflow-visible print:h-auto print:min-h-0 print:max-h-none bg-slate-50 dark:bg-slate-900 print:bg-white"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
