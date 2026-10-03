'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PickleballGame } from '@/hooks/usePickleballGame';
import type { OpenPlay } from '@/hooks/useOpenPlay';
import {
  GameState,
  Player,
  applyMatchSettings,
  isMatchWon,
  resetGame,
  safeMatchMode,
} from '@/lib/pickleball-state';
import { Court, OpenPlaySession, getPlayerName } from '@/lib/open-play';

const STORAGE_KEY = 'kc-court-scoreboards';
/** Parking key for the scoreboard's own match, the one not tied to a court. */
const FREE_PLAY = 'free-play';
/** Undo steps kept per parked scoreboard when saving. The live one keeps all 25. */
const PARKED_UNDO = 10;

interface LinkState {
  /** The court the scoreboard follows; null for free play. */
  courtId: string | null;
  /** The court match the scoreboard's live state belongs to; null for free play. */
  matchId: string | null;
  /**
   * Scoreboards set aside while another is on screen, keyed by court match id
   * (or FREE_PLAY). Switching back restores the score and its undo history.
   */
  parked: Record<string, GameState>;
}

const EMPTY_LINK: LinkState = { courtId: null, matchId: null, parked: {} };

/** What the open play views need to know about a court's scoreboard. */
export interface CourtScore {
  score: [number, number];
  /** Set once the scoreboard match is decided. */
  winner: 0 | 1 | null;
  /** Points are only a court result in single-game mode; a series reports games. */
  pointsAreFinal: boolean;
}

/** Photos come from open play and are re-attached on the way back in. */
function stripPhotos(state: GameState): GameState {
  const bare = (players: [Player, Player]): [Player, Player] => [{ name: players[0].name }, { name: players[1].name }];
  const strip = (s: GameState): GameState => ({
    ...s,
    teams: {
      A: { ...s.teams.A, players: bare(s.teams.A.players) },
      B: { ...s.teams.B, players: bare(s.teams.B.players) },
    },
  });
  return { ...strip(state), gameHistory: (state.gameHistory ?? []).map(strip) };
}

function scoreOf(state: GameState): CourtScore {
  const won = isMatchWon(state).winner;
  return {
    score: [state.teams.A.score, state.teams.B.score],
    winner: won === 'A' ? 0 : won === 'B' ? 1 : null,
    pointsAreFinal: safeMatchMode(state.matchMode) === 'casual',
  };
}

function parseLink(raw: unknown): LinkState {
  if (!raw || typeof raw !== 'object') return EMPTY_LINK;
  const r = raw as Partial<LinkState>;
  const parked = Object.fromEntries(
    Object.entries(r.parked && typeof r.parked === 'object' ? r.parked : {}).filter(
      ([, state]) => Boolean(state?.teams?.A && state?.teams?.B && state?.serving),
    ),
  );
  return {
    courtId: typeof r.courtId === 'string' ? r.courtId : null,
    matchId: typeof r.matchId === 'string' ? r.matchId : null,
    parked,
  };
}

/**
 * Keeps the doubles scoreboard in step with open play.
 *
 * The scoreboard follows a court rather than a single match: when that court
 * moves on to its next match, the next match comes up on the scoreboard by
 * itself. Every court keeps its own scoreboard, so switching between courts —
 * or back to free play — never throws a score away.
 */
export function useCourtScoreboard(game: PickleballGame, openPlay: OpenPlay) {
  const [link, setLink] = useState<LinkState>(EMPTY_LINK);
  const [isLoaded, setIsLoaded] = useState(false);
  /** What was last saved, so a point scored elsewhere doesn't re-save every parked court. */
  const lastSaved = useRef<{ link: LinkState; live: string } | null>(null);

  const { gameState, replaceState } = game;
  const { session, photos, finishMatch } = openPlay;
  const ready = isLoaded && !game.isLoading && !openPlay.isLoading && Boolean(session) && Boolean(gameState);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setLink(parseLink(JSON.parse(stored)));
    } catch (error) {
      console.error('Failed to load court scoreboards:', error);
    }
    setIsLoaded(true);
  }, []);

  // Persist only what can still be shown: free play, and matches on a court.
  useEffect(() => {
    if (!ready || !session) return;
    const live = new Set(session.courts.flatMap(c => (c.match ? [c.match.id] : [])));
    const liveKey = [...live].join();
    if (lastSaved.current?.link === link && lastSaved.current.live === liveKey) return;
    lastSaved.current = { link, live: liveKey };
    const parked = Object.fromEntries(
      Object.entries(link.parked)
        .filter(([key]) => key === FREE_PLAY || live.has(key))
        .map(([key, state]) => [key, { ...state, gameHistory: state.gameHistory.slice(-PARKED_UNDO) }]),
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...link, parked }));
    } catch {
      try {
        const lean = Object.fromEntries(Object.entries(parked).map(([k, s]) => [k, { ...s, gameHistory: [] }]));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...link, parked: lean }));
      } catch (error) {
        console.error('Failed to save court scoreboards:', error);
      }
    }
  }, [link, session, ready]);

  /** Re-attach open play photos by name — roster names are unique. */
  const withPhotos = useCallback(
    (state: GameState, current: OpenPlaySession): GameState => {
      const idByName = new Map(current.players.map(p => [p.name, p.id]));
      const dress = (players: [Player, Player]): [Player, Player] => [
        { ...players[0], photo: photos[idByName.get(players[0].name) ?? ''] },
        { ...players[1], photo: photos[idByName.get(players[1].name) ?? ''] },
      ];
      return {
        ...state,
        teams: {
          A: { ...state.teams.A, players: dress(state.teams.A.players) },
          B: { ...state.teams.B, players: dress(state.teams.B.players) },
        },
      };
    },
    [photos],
  );

  /** A fresh single game between the court's two teams. */
  const freshCourtState = useCallback((court: Court, current: OpenPlaySession): GameState => {
    const teams = court.match!.teams;
    const players = (ids: [string, string]): [Player, Player] => [
      { name: getPlayerName(current, ids[0]) },
      { name: getPlayerName(current, ids[1]) },
    ];
    // Same labels as the court card; the bar above the scoreboard names the court.
    return applyMatchSettings(resetGame(), {
      teamAName: 'Team 1',
      teamBName: 'Team 2',
      teamAPlayers: players(teams[0]),
      teamBPlayers: players(teams[1]),
      matchMode: 'casual',
    });
  }, []);

  /** Show a court's scoreboard, or free play with `null`. */
  const show = useCallback(
    (courtId: string | null) => {
      if (!session || !gameState) return;
      const court = courtId ? session.courts.find(c => c.id === courtId) : undefined;
      if (courtId && !court) return;
      const targetMatchId = court?.match?.id ?? null;
      if (courtId === link.courtId && (!court?.match || targetMatchId === link.matchId)) return;

      const parked = { ...link.parked, [link.matchId ?? FREE_PLAY]: stripPhotos(gameState) };
      let next: GameState | null = null;
      let matchId = link.matchId;

      if (!court) {
        next = parked[FREE_PLAY] ?? resetGame();
        delete parked[FREE_PLAY];
        matchId = null;
      } else if (court.match) {
        next = parked[court.match.id] ?? freshCourtState(court, session);
        delete parked[court.match.id];
        matchId = court.match.id;
      }
      // An open court keeps whatever is on screen until its next match starts.

      if (next) replaceState(withPhotos(next, session));
      setLink({ courtId: courtId ?? null, matchId, parked });
    },
    [session, gameState, link, replaceState, withPhotos, freshCourtState],
  );

  // When the followed court moves on to a new match, bring it up. The old
  // match's scoreboard is dropped: its result is the court's to record.
  useEffect(() => {
    if (!ready || !session || !gameState || !link.courtId) return;
    const court = session.courts.find(c => c.id === link.courtId);
    if (!court) {
      setLink(prev => ({ ...prev, courtId: null }));
      return;
    }
    if (!court.match || court.match.id === link.matchId) return;

    const parked = { ...link.parked };
    if (link.matchId === null) parked[FREE_PLAY] = stripPhotos(gameState);
    const next = parked[court.match.id] ?? freshCourtState(court, session);
    delete parked[court.match.id];
    replaceState(withPhotos(next, session));
    setLink({ courtId: court.id, matchId: court.match.id, parked });
  }, [ready, session, gameState, link, replaceState, withPhotos, freshCourtState]);

  const followedCourt = session?.courts.find(c => c.id === link.courtId) ?? null;
  /** The followed court's current match is the one on screen. */
  const isShowingCourtMatch = Boolean(followedCourt?.match && followedCourt.match.id === link.matchId);

  /** Live scores for every court match with a scoreboard, keyed by match id. */
  const courtScores = useMemo(() => {
    const scores = new Map<string, CourtScore>();
    if (!session) return scores;
    for (const court of session.courts) {
      const id = court.match?.id;
      if (!id) continue;
      if (id === link.matchId && gameState) scores.set(id, scoreOf(gameState));
      else if (link.parked[id]) scores.set(id, scoreOf(link.parked[id]));
    }
    return scores;
  }, [session, link, gameState]);

  /** Record a decided scoreboard game as its court's result. */
  const recordCourt = useCallback(
    (courtId: string) => {
      const court = session?.courts.find(c => c.id === courtId);
      const result = court?.match ? courtScores.get(court.match.id) : undefined;
      if (!court || !result || result.winner === null) return;
      finishMatch(court.id, result.winner, result.pointsAreFinal ? result.score : null);
    },
    [session, courtScores, finishMatch],
  );

  /** Any court in play — the cue to offer court scoreboards at all. */
  const hasCourtsInPlay = Boolean(session?.courts.some(c => c.match));
  const firstCourtInPlay = session?.courts.find(c => c.match) ?? null;

  return {
    isLoaded,
    followedCourt,
    isShowingCourtMatch,
    isFreePlay: link.courtId === null,
    courtScores,
    hasCourtsInPlay,
    firstCourtInPlay,
    show,
    recordCourt,
  };
}

export type CourtScoreboard = ReturnType<typeof useCourtScoreboard>;
