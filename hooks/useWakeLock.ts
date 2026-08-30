'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
};

/**
 * Keep the screen awake while a match is on the court.
 *
 * The Screen Wake Lock API drops the lock whenever the page is hidden, so the
 * lock is re-acquired on visibility change for as long as `enabled` is true.
 * Unsupported browsers report `isSupported: false` and are otherwise inert.
 */
export function useWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  }, []);

  const release = useCallback(async () => {
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    setIsActive(false);
    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch {
        // Already gone — nothing to clean up.
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !isSupported) {
      void release();
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || sentinelRef.current) return;
      try {
        const sentinel = await (navigator as unknown as {
          wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
        }).wakeLock.request('screen');

        if (cancelled) {
          void sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        setIsActive(true);
        sentinel.addEventListener('release', () => {
          sentinelRef.current = null;
          setIsActive(false);
        });
      } catch {
        // Denied (e.g. low battery) — the app works fine without it.
        setIsActive(false);
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', acquire);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      void release();
    };
  }, [enabled, isSupported, release]);

  return { isActive, isSupported };
}
