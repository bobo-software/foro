import { useEffect } from 'react';

let portalNoIndexConsumers = 0;

/**
 * Ensures a `noindex, nofollow` robots meta tag while a portal route is mounted.
 * Ref-counted so nested or overlapping portal views do not remove the tag early.
 */
export function usePortalNoIndex(): void {
  useEffect(() => {
    portalNoIndexConsumers += 1;
    if (!document.querySelector('meta[name="robots"][data-foro-portal]')) {
      const m = document.createElement('meta');
      m.setAttribute('name', 'robots');
      m.setAttribute('content', 'noindex, nofollow');
      m.setAttribute('data-foro-portal', '');
      document.head.appendChild(m);
    }
    return () => {
      portalNoIndexConsumers -= 1;
      if (portalNoIndexConsumers <= 0) {
        portalNoIndexConsumers = 0;
        document.querySelector('meta[name="robots"][data-foro-portal]')?.remove();
      }
    };
  }, []);
}
