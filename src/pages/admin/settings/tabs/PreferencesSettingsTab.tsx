import useThemeStore from '@/stores/state/ThemeStore';

export function PreferencesSettingsTab() {
  const darkMode = useThemeStore((s) => s.theme === 'dark');
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
        Preferences
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Customize your experience.
      </p>

      <div className="space-y-4">
        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Dark Mode</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Switch between light and dark theme
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              darkMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                darkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Currency */}
        <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Currency</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Default currency for invoices and statements
            </p>
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg">
            ZAR (Rand)
          </span>
        </div>

        {/* Date Format */}
        <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Date Format</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              How dates are displayed
            </p>
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg">
            DD/MM/YYYY
          </span>
        </div>

        {/* Time Zone */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Time Zone</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your local time zone
            </p>
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg">
            Africa/Johannesburg (SAST)
          </span>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        Additional preference options will be available in a future update.
      </p>
    </div>
  );
}

export default PreferencesSettingsTab;
