'use client';

import { useState, useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  GameState,
  GameEvent,
  Player,
  scorePoint as scorePointFn,
  recordFault as recordFaultFn,
  resetGame as resetGameFn,
  resetGameKeepSettings as resetGameKeepSettingsFn,
  undoLastAction as undoLastActionFn,
  applyMatchSettings,
  getServerPosition,
  getServingPlayerIndex,
  getReceivingPlayerIndex,
  getScoreCall,
  isGamePoint as isGamePointFn,
  isMatchPoint as isMatchPointFn,
  isGameWon as isGameWonFn,
  isMatchWon as isMatchWonFn,
  startNextGame as startNextGameFn,
  getMomentum as getMomentumFn,
  getLongestRuns,
  getServeConversion,
  getWinProbability as getWinProbabilityFn,
  ensureMatchStats,
  safeMatchMode,
  MatchMode,
} from '@/lib/pickleball-state';

const STORAGE_KEY = 'pickleball-game-state';

/**
 * Migrate older persisted states to include new fields.
 * This ensures backward compatibility when the user refreshes
 * with state saved from a previous version.
 */
function migrateState(parsed: GameState): GameState {
  let state = { ...parsed };

  if (!state.events) state.events = [];
  if (!Array.isArray(state.gameHistory)) state.gameHistory = [];
  if (!state.gamesWon) state.gamesWon = { A: 0, B: 0 };
  if (!state.currentGame) state.currentGame = 1;
  state.matchMode = safeMatchMode(state.matchMode);

  state = ensureMatchStats(state);

  state.events = state.events.map((event: GameEvent, index: number) => ({
    id: event.id || `migrated-${index}-${Date.now().toString(36)}`,
    type: event.type,
    team: event.team,
    server: event.server ?? event.serverAfter?.serverNumber ?? 1,
    score: event.score || `${event.scoreAfter?.A ?? 0}-${event.scoreAfter?.B ?? 0}-${event.serverAfter?.serverNumber ?? 1}`,
    scoreAfter: event.scoreAfter || { A: 0, B: 0 },
    serverAfter: event.serverAfter || { team: 'A', serverNumber: 1 },
    game: event.game ?? 1,
    timestamp: event.timestamp || Date.now(),
  }));

  // Older versions nested a full copy of state (photos included) in every
  // history entry. Flatten so the undo stack stays cheap.
  state.gameHistory = state.gameHistory.map(entry => ({ ...entry, gameHistory: [] }));

  return state;
}

const stripPhotos = (players: [Player, Player]): [Player, Player] => [
  { name: players[0].name },
  { name: players[1].name },
];

/**
 * Photos are stripped from the undo stack to stay inside the localStorage
 * quota, so an undone state comes back photo-less. Re-attach the photos the
 * live state is already carrying.
 */
function prepareForStorage(state: GameState): GameState {
  return {
    ...state,
    gameHistory: state.gameHistory.map(h => ({
      ...h,
      teams: {
        A: { ...h.teams.A, players: stripPhotos(h.teams.A.players) },
        B: { ...h.teams.B, players: stripPhotos(h.teams.B.players) },
      },
      gameHistory: [],
    })),
  };
}

function restorePhotos(restored: GameState, current: GameState): GameState {
  const merge = (from: [Player, Player], to: [Player, Player]): [Player, Player] => [
    { ...to[0], photo: to[0].photo ?? from[0]?.photo },
    { ...to[1], photo: to[1].photo ?? from[1]?.photo },
  ];

  return {
    ...restored,
    teams: {
      A: { ...restored.teams.A, players: merge(current.teams.A.players, restored.teams.A.players) },
      B: { ...restored.teams.B, players: merge(current.teams.B.players, restored.teams.B.players) },
    },
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'hydrate'; state: GameState }
  | { type: 'point' }
  | { type: 'fault' }
  | { type: 'reset' }
  | { type: 'restart' }
  | { type: 'nextGame' }
  | { type: 'undo' }
  | {
      type: 'settings';
      teamAName: string;
      teamBName: string;
      teamAPlayers: [Player, Player];
      teamBPlayers: [Player, Player];
      matchMode: MatchMode;
    };

/** Pure — no storage writes, no timers. Safe under StrictMode double-invoke. */
function reducer(state: GameState | null, action: Action): GameState | null {
  if (action.type === 'hydrate') return action.state;
  if (action.type === 'reset') return resetGameFn();
  if (!state) return state;

  switch (action.type) {
    case 'point':
      return scorePointFn(state);
    case 'fault':
      return recordFaultFn(state);
    case 'restart':
      return resetGameKeepSettingsFn(state);
    case 'nextGame':
      return startNextGameFn(state);
    case 'undo': {
      const restored = undoLastActionFn(state);
      return restored === state ? state : restorePhotos(restored, state);
    }
    case 'settings':
      return applyMatchSettings(state, action);
    default:
      return state;
  }
}

export function usePickleballGame() {
  const [gameState, dispatch] = useReducer(reducer, null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAction, setLastAction] = useState<'point' | 'fault' | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      dispatch({
        type: 'hydrate',
        state: stored ? migrateState(JSON.parse(stored) as GameState) : resetGameFn(),
      });
    } catch (error) {
      console.error('Failed to load game state:', error);
      dispatch({ type: 'hydrate', state: resetGameFn() });
    }
    setIsLoading(false);
  }, []);

  // Persist after every committed change, rather than mid-dispatch.
  useEffect(() => {
    if (!gameState || isLoading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prepareForStorage(gameState)));
      setStorageError(null);
    } catch (error) {
      // Almost always a quota overflow from player photos. Retry without the
      // undo stack before giving up, so the live score still survives a reload.
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...gameState, gameHistory: [] }));
        setStorageError(null);
      } catch {
        console.error('Failed to save game state:', error);
        setStorageError('Could not save this match locally — storage is full.');
      }
    }
  }, [gameState, isLoading]);

  // Clear the action flash after the animation has played.
  useEffect(() => {
    if (!lastAction) return;
    const timer = window.setTimeout(() => setLastAction(null), 600);
    return () => window.clearTimeout(timer);
  }, [lastAction]);

  const scorePoint = useCallback(() => {
    setLastAction('point');
    dispatch({ type: 'point' });
  }, []);

  const recordFault = useCallback(() => {
    setLastAction('fault');
    dispatch({ type: 'fault' });
  }, []);

  const resetGame = useCallback(() => {
    setLastAction(null);
    dispatch({ type: 'reset' });
  }, []);

  const resetGameKeepSettings = useCallback(() => {
    setLastAction(null);
    dispatch({ type: 'restart' });
  }, []);

  const startNextGame = useCallback(() => {
    setLastAction(null);
    dispatch({ type: 'nextGame' });
  }, []);

  const undo = useCallback(() => {
    setLastAction(null);
    dispatch({ type: 'undo' });
  }, []);

  const updateMatchSettings = useCallback(
    (
      teamAName: string,
      teamBName: string,
      teamAPlayers: [Player, Player],
      teamBPlayers: [Player, Player],
      matchMode: MatchMode
    ) => {
      dispatch({ type: 'settings', teamAName, teamBName, teamAPlayers, teamBPlayers, matchMode });
    },
    []
  );

  // ─── Derived values ─────────────────────────────────────────────────────────
  const derived = useMemo(() => {
    if (!gameState) {
      return {
        serverPosition: 'right' as const,
        servingPlayerIndex: 0 as 0 | 1,
        receivingPlayerIndex: 0 as 0 | 1,
        scoreCall: null,
        gamePoint: { isGamePoint: false, team: null as 'A' | 'B' | null },
        matchPoint: { isMatchPoint: false, team: null as 'A' | 'B' | null },
        gameWon: { isWon: false, winner: null as 'A' | 'B' | null },
        matchWon: { isWon: false, winner: null as 'A' | 'B' | null },
        momentum: {
          teamAPoints: 0,
          teamBPoints: 0,
          dominant: 'even' as const,
          streak: { team: null as 'A' | 'B' | null, count: 0 },
          recentPoints: [] as Array<'A' | 'B'>,
        },
        winProbability: 50,
        longestRuns: { A: 0, B: 0 },
        serveConversion: { A: 0, B: 0 },
      };
    }

    return {
      serverPosition: getServerPosition(gameState),
      servingPlayerIndex: getServingPlayerIndex(gameState),
      receivingPlayerIndex: getReceivingPlayerIndex(gameState),
      scoreCall: getScoreCall(gameState),
      gamePoint: isGamePointFn(gameState),
      matchPoint: isMatchPointFn(gameState),
      gameWon: isGameWonFn(gameState),
      matchWon: isMatchWonFn(gameState),
      momentum: getMomentumFn(gameState),
      winProbability: getWinProbabilityFn(gameState),
      longestRuns: getLongestRuns(gameState),
      serveConversion: getServeConversion(gameState),
    };
  }, [gameState]);

  return {
    gameState,
    isLoading,
    lastAction,
    storageError,
    canUndo: (gameState?.gameHistory?.length ?? 0) > 0,
    scorePoint,
    recordFault,
    resetGame,
    resetGameKeepSettings,
    startNextGame,
    undo,
    updateMatchSettings,
    ...derived,
    matchStats: gameState?.matchStats ?? {
      A: { pointsWon: 0, faults: 0, sideOuts: 0 },
      B: { pointsWon: 0, faults: 0, sideOuts: 0 },
    },
    events: gameState?.events ?? [],
  };
}
