'use client';

import { useEffect } from 'react';

/**
 * Registers the offline worker in production, and tells it what the page
 * loaded so a first visit is saved too. Renders nothing.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // In development a worker left over from a production build on this origin
    // would serve stale files into every reload, so clear it out.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then(registrations => registrations.forEach(registration => void registration.unregister()))
        .catch(() => undefined);
      return;
    }

    let cancelled = false;

    const settled = () =>
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise<void>(resolve => window.addEventListener('load', () => resolve(), { once: true }));

    async function register() {
      try {
        // `none` makes the browser look for a new worker on every visit
        // instead of trusting an HTTP-cached copy of the old one.
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
        await navigator.serviceWorker.ready;
        // Icons and fonts finish after `load`; wait for them so they are listed.
        await Promise.all([settled(), document.fonts?.ready]);
        if (cancelled) return;

        const urls = performance.getEntriesByType('resource').map(entry => entry.name);
        registration.active?.postMessage({ type: 'cache-resources', urls });
      } catch (error) {
        // Offline support is a bonus: the app works without it.
        console.error('Could not set up offline support:', error);
      }
    }

    void register();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
