'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionContext,
  MatchingMode,
  NewPlayer,
  OpenPlaySession,
  PlayerDetails,
  addPlayers as addPlayersFn,
  cancelMatch as cancelMatchFn,
  createSession,
  deleteResult as deleteResultFn,
  fillOpenCourts as fillOpenCourtsFn,
  finishMatch as finishMatchFn,
  getBlockedPlayer,
  getPlayerRecords,
  getPlayerStatuses,
  getStandings,
  getWaitingPlayers,
  parseSession,
  removePlayer as removePlayerFn,
  resetSession as resetSessionFn,
  setAutoStart as setAutoStartFn,
  setCourtCount as setCourtCountFn,
  setMatchingMode as setMatchingModeFn,
  setPartner as setPartnerFn,
  setPlayerActive as setPlayerActiveFn,
  shuffleUpNext as shuffleUpNextFn,
  startMatch as startMatchFn,
  undoLast,
  updatePlayer as updatePlayerFn,
} from '@/lib/open-play';
import { getPlayerInsights, getSessionHighlights } from '@/lib/open-play-stats';

const STORAGE_KEY = 'kc-open-play';
/**
 * Photos are kept apart from the session. Inside it, every undo snapshot
 * would carry every face and blow the storage quota within a few taps.
 */
const PHOTOS_KEY = 'kc-open-play-photos';

export type PhotoMap = Record<string, string>;

/** A player being checked in, optionally with a photo taken at the desk. */
export interface NewPlayerWithPhoto extends NewPlayer {
  photo?: string;
}

function parsePhotos(raw: unknown): PhotoMap {
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].startsWith('data:image/'),
    ),
  );
}

/**
 * Keep photos for anyone the session can still reach — the roster, or a
 * snapshot an undo could restore — so removing a player and undoing it
 * brings their face back too.
 */
function referencedPhotos(photos: PhotoMap, session: OpenPlaySession): PhotoMap {
  const ids = new Set(session.players.map(p => p.id));
  for (const entry of session.history) for (const p of entry.snapshot.players) ids.add(p.id);
  return Object.fromEntries(Object.entries(photos).filter(([id]) => ids.has(id)));
}

function photoOwnerId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}

/**
 * Time and randomness are captured once, when the user acts, and handed to
 * the pure session functions. The state updater can then run twice under
 * StrictMode and land on the same state both times.
 */
function context(): ActionContext {
  return { now: Date.now(), seed: randomSeed() };
}

export function useOpenPlay() {
  const [session, setSession] = useState<OpenPlaySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoMap>({});
  const [photoError, setPhotoError] = useState<string | null>(null);
  /** What was last written, so a score tap doesn't re-serialise every photo. */
  const lastPhotoWrite = useRef<{ photos: PhotoMap; ids: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setSession(stored ? parseSession(JSON.parse(stored), randomSeed()) : createSession());
    } catch (error) {
      console.error('Failed to load open play session:', error);
      setSession(createSession());
    }
    try {
      const storedPhotos = localStorage.getItem(PHOTOS_KEY);
      if (storedPhotos) setPhotos(parsePhotos(JSON.parse(storedPhotos)));
    } catch (error) {
      console.error('Failed to load player photos:', error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!session || isLoading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setStorageError(null);
    } catch (error) {
      // The undo stack is the only part that can grow; drop it before giving up.
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, history: [] }));
        setStorageError(null);
      } catch {
        console.error('Failed to save open play session:', error);
        setStorageError('Could not save this session locally — storage is full.');
      }
    }
  }, [session, isLoading]);

  useEffect(() => {
    if (!session || isLoading) return;
    const kept = referencedPhotos(photos, session);
    const ids = Object.keys(kept).sort().join();
    const last = lastPhotoWrite.current;
    if (last && last.photos === photos && last.ids === ids) return;
    try {
      localStorage.setItem(PHOTOS_KEY, JSON.stringify(kept));
      lastPhotoWrite.current = { photos, ids };
      setPhotoError(null);
    } catch (error) {
      console.error('Failed to save player photos:', error);
      setPhotoError('Could not save the latest photo — storage is full. Remove a few photos to make room.');
    }
  }, [photos, session, isLoading]);

  const setPhoto = useCallback((playerId: string, photo: string | null) => {
    setPhotos(prev => {
      if (photo) return { ...prev, [playerId]: photo };
      if (!(playerId in prev)) return prev;
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
  }, []);

  const apply = useCallback((run: (current: OpenPlaySession, ctx: ActionContext) => OpenPlaySession) => {
    const ctx = context();
    setSession(prev => (prev ? run(prev, ctx) : prev));
  }, []);

  const actions = useMemo(
    () => ({
      addPlayers: (entries: NewPlayerWithPhoto[]) => {
        // Pick the id now, so a photo taken before check-in has a key to sit under.
        const keyed = entries.map(({ photo, ...entry }) => ({ entry: photo ? { ...entry, id: photoOwnerId() } : entry, photo }));
        apply((s, ctx) => addPlayersFn(s, keyed.map(k => k.entry), ctx));
        for (const { entry, photo } of keyed) if (photo && entry.id) setPhoto(entry.id, photo);
      },
      setPhoto,
      updatePlayer: (id: string, changes: Partial<PlayerDetails>) =>
        apply((s, ctx) => updatePlayerFn(s, id, changes, ctx)),
      setPartner: (id: string, partnerId: string | null) =>
        apply((s, ctx) => setPartnerFn(s, id, partnerId, ctx)),
      setPlayerActive: (id: string, active: boolean) =>
        apply((s, ctx) => setPlayerActiveFn(s, id, active, ctx)),
      removePlayer: (id: string) => apply((s, ctx) => removePlayerFn(s, id, ctx)),
      setCourtCount: (count: number) => apply((s, ctx) => setCourtCountFn(s, count, ctx)),
      setMatchingMode: (mode: MatchingMode) => apply((s, ctx) => setMatchingModeFn(s, mode, ctx)),
      setAutoStart: (autoStart: boolean) => apply(s => setAutoStartFn(s, autoStart)),
      shuffleUpNext: () => apply((s, ctx) => shuffleUpNextFn(s, ctx)),
      startMatch: (courtId: string) => apply((s, ctx) => startMatchFn(s, courtId, ctx)),
      fillOpenCourts: () => apply((s, ctx) => fillOpenCourtsFn(s, ctx)),
      finishMatch: (courtId: string, winner: 0 | 1, score: [number, number] | null) =>
        apply((s, ctx) => finishMatchFn(s, courtId, winner, score, ctx)),
      cancelMatch: (courtId: string) => apply((s, ctx) => cancelMatchFn(s, courtId, ctx)),
      deleteResult: (resultId: string) => apply(s => deleteResultFn(s, resultId)),
      resetSession: (keepRoster: boolean) => apply((s, ctx) => resetSessionFn(s, keepRoster, ctx)),
      undo: () => apply(s => undoLast(s)),
    }),
    [apply, setPhoto],
  );

  const derived = useMemo(() => {
    if (!session) return null;
    const insights = getPlayerInsights(session.results);
    return {
      insights,
      highlights: getSessionHighlights(session.results, insights),
      waiting: getWaitingPlayers(session),
      statuses: getPlayerStatuses(session),
      blocked: getBlockedPlayer(session),
      records: getPlayerRecords(session.results),
      standings: getStandings(session),
      lastUndoLabel: session.history[session.history.length - 1]?.label ?? null,
    };
  }, [session]);

  return { session, isLoading, storageError: storageError ?? photoError, photos, derived, ...actions };
}

export type OpenPlay = ReturnType<typeof useOpenPlay>;
