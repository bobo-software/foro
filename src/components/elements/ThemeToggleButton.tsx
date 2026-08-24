import { LuMoon, LuSun } from 'react-icons/lu';
import useThemeStore from '@/stores/state/ThemeStore';

interface ThemeToggleButtonProps {
  className?: string;
}

/** Compact icon-only light/dark toggle, for headers that don't have the full profile menu (e.g. public portal pages). */
export function ThemeToggleButton({ className = '' }: ThemeToggleButtonProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${className}`}
    >
      {theme === 'dark' ? <LuSun size={16} /> : <LuMoon size={16} />}
    </button>
  );
}

export default ThemeToggleButton;
