import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  hasUserSetTheme: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const getSystemTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: getSystemTheme(),
      hasUserSetTheme: false,
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light', hasUserSetTheme: true })),
      setTheme: (theme) => set({ theme, hasUserSetTheme: true }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

// Follow the OS theme in real time until the user makes an explicit choice.
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!useThemeStore.getState().hasUserSetTheme) {
      useThemeStore.setState({ theme: e.matches ? 'dark' : 'light' });
    }
  });
}

export default useThemeStore;
