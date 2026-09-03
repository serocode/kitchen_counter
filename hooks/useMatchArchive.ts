'use client';

import { useCallback, useEffect, useState } from 'react';
import { GameState } from '@/lib/pickleball-state';
import {
  ArchivedMatch,
  matchIdOf,
  readArchive,
  sameArchive,
  summarizeMatch,
  upsertMatch,
  writeArchive,
} from '@/lib/match-archive';

/**
 * Keeps the completed-match archive in step with the live match.
 *
 * A match is archived the moment it is won, and removed again if that winning
 * point is undone — so the archive never claims a result the scoreboard has
 * walked back. Writes are keyed on the match id, making them idempotent under
 * StrictMode's double-invoked effects.
 */
export function useMatchArchive(
  gameState: GameState | null,
  matchWinner: 'A' | 'B' | null,
) {
  const [archive, setArchive] = useState<ArchivedMatch[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setArchive(readArchive());
    setIsLoaded(true);
  }, []);

  // Reconcile the current match into (or out of) the archive. The updater is
  // pure and returns `prev` untouched when nothing changed, so React bails out
  // rather than re-rendering.
  useEffect(() => {
    if (!isLoaded || !gameState) return;
    const id = matchIdOf(gameState);
    if (!id) return;

    setArchive(prev => {
      const entry = matchWinner ? summarizeMatch(gameState, matchWinner) : null;
      const next = entry ? upsertMatch(prev, entry) : prev.filter(m => m.id !== id);
      return sameArchive(prev, next) ? prev : next;
    });
  }, [gameState, matchWinner, isLoaded]);

  // Persist separately from deriving, so the reconcile effect above stays pure.
  useEffect(() => {
    if (!isLoaded) return;
    writeArchive(archive);
  }, [archive, isLoaded]);

  const deleteMatch = useCallback((id: string) => {
    setArchive(prev => prev.filter(m => m.id !== id));
  }, []);

  const clearArchive = useCallback(() => setArchive([]), []);

  return { archive, isArchiveLoaded: isLoaded, deleteMatch, clearArchive };
}
