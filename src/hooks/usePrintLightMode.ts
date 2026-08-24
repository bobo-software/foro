import { useEffect } from 'react';
import useThemeStore from '../stores/state/ThemeStore';

/**
 * Forces light mode for the duration of any browser print (native Ctrl+P, a
 * page's "Print" button, or "Save as PDF" via the print dialog — all fire
 * `beforeprint`/`afterprint`). Printed documents (invoices, quotations,
 * statements, credit notes) should never render with dark backgrounds —
 * wastes ink and looks wrong on paper — regardless of the viewer's app
 * theme. jsPDF-generated downloads are unaffected; they draw fixed colors
 * from `getTemplateConfig()`, not the DOM/CSS.
 */
export function usePrintLightMode(): void {
  useEffect(() => {
    function forceLight() {
      document.documentElement.classList.remove('dark');
    }
    function restoreTheme() {
      document.documentElement.classList.toggle('dark', useThemeStore.getState().theme === 'dark');
    }
    window.addEventListener('beforeprint', forceLight);
    window.addEventListener('afterprint', restoreTheme);
    return () => {
      window.removeEventListener('beforeprint', forceLight);
      window.removeEventListener('afterprint', restoreTheme);
    };
  }, []);
}
