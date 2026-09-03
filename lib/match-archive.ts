/**
 * Completed-match archive.
 *
 * The live match lives under its own `pickleball-game-state` key and is wiped
 * by a reset, so finished matches are summarised into a separate key here.
 * Entries are summaries, not full `GameState`s: no event log, no undo stack and
 * no player photos, which keeps a long season well inside the storage quota.
 */

import { GameState, MatchMode, MatchStats, safeMatchMode } from './pickleball-state';

const STORAGE_KEY = 'pickleball-match-archive';

/** Bumped only if the stored shape changes incompatibly. */
const ARCHIVE_VERSION = 1;

/** Oldest entries beyond this are dropped, newest kept. */
export const MAX_ARCHIVED_MATCHES = 50;

export interface ArchivedGameScore {
  game: number;
  A: number;
  B: number;
}

export interface ArchivedTeam {
  name: string;
  players: [string, string];
}

export interface ArchivedMatch {
  /** The first event's id — stable for the life of one match. */
  id: string;
  matchMode: MatchMode;
  startedAt: number;
  endedAt: number;
  winner: 'A' | 'B';
  teams: { A: ArchivedTeam; B: ArchivedTeam };
  gamesWon: { A: number; B: number };
  /** Final score of each game played, in order. */
  games: ArchivedGameScore[];
  stats: { A: MatchStats; B: MatchStats };
}

interface ArchiveFile {
  version: number;
  matches: ArchivedMatch[];
}

/**
 * Identity of the match currently in `state`.
 *
 * The first event's id is append-only for the whole match: undo pops from the
 * end, and a reset or rematch starts a fresh event list. That makes archive
 * writes idempotent — re-running a sync overwrites one entry rather than
 * appending a duplicate.
 */
export function matchIdOf(state: GameState | null): string | null {
  return state?.events?.[0]?.id ?? null;
}

/**
 * Final score of each game, derived from the event log.
 *
 * Events are chronological, so the last event carrying a given game number
 * holds that game's closing score. This is the only way to recover the earlier
 * games' scores, since `teams.X.score` is reset to 0 for each new game.
 */
function gameScoresOf(state: GameState): ArchivedGameScore[] {
  const finalByGame = new Map<number, { A: number; B: number }>();
  for (const event of state.events ?? []) {
    finalByGame.set(event.game ?? 1, {
      A: event.scoreAfter?.A ?? 0,
      B: event.scoreAfter?.B ?? 0,
    });
  }
  return [...finalByGame.entries()]
    .sort(([a], [b]) => a - b)
    .map(([game, score]) => ({ game, A: score.A, B: score.B }));
}

/**
 * Summarise a won match.
 *
 * Deliberately free of `Date.now()` and of anything else non-deterministic:
 * summarising the same state twice must produce an identical object, so the
 * sync effect can compare against what is already stored and skip the write.
 */
export function summarizeMatch(
  state: GameState,
  winner: 'A' | 'B',
): ArchivedMatch | null {
  const id = matchIdOf(state);
  const events = state.events ?? [];
  if (!id || events.length === 0) return null;

  const playerNames = (team: 'A' | 'B'): [string, string] => [
    state.teams[team].players[0]?.name ?? '',
    state.teams[team].players[1]?.name ?? '',
  ];

  return {
    id,
    matchMode: safeMatchMode(state.matchMode),
    startedAt: events[0].timestamp,
    endedAt: events[events.length - 1].timestamp,
    winner,
    teams: {
      A: { name: state.teams.A.name, players: playerNames('A') },
      B: { name: state.teams.B.name, players: playerNames('B') },
    },
    gamesWon: { A: state.gamesWon?.A ?? 0, B: state.gamesWon?.B ?? 0 },
    games: gameScoresOf(state),
    stats: {
      A: { ...state.matchStats.A },
      B: { ...state.matchStats.B },
    },
  };
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function isArchivedMatch(value: unknown): value is ArchivedMatch {
  if (!value || typeof value !== 'object') return false;
  const m = value as Partial<ArchivedMatch>;
  return (
    typeof m.id === 'string' &&
    (m.winner === 'A' || m.winner === 'B') &&
    typeof m.startedAt === 'number' &&
    typeof m.endedAt === 'number' &&
    Array.isArray(m.games) &&
    !!m.teams?.A &&
    !!m.teams?.B &&
    !!m.stats?.A &&
    !!m.stats?.B
  );
}

/** Newest first. Returns [] on absent, corrupt or foreign-version data. */
export function readArchive(): ArchivedMatch[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ArchiveFile;
    if (parsed?.version !== ARCHIVE_VERSION || !Array.isArray(parsed.matches)) {
      return [];
    }
    return parsed.matches.filter(isArchivedMatch).sort((a, b) => b.endedAt - a.endedAt);
  } catch {
    // Corrupt JSON is not worth surfacing: the live match is unaffected and a
    // later write will replace it.
    return [];
  }
}

/** Returns false if the write failed (quota, private mode). */
export function writeArchive(matches: ArchivedMatch[]): boolean {
  if (typeof localStorage === 'undefined') return false;
  const file: ArchiveFile = {
    version: ARCHIVE_VERSION,
    matches: matches.slice(0, MAX_ARCHIVED_MATCHES),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

// ─── Pure list operations ─────────────────────────────────────────────────────

/** Replace the entry with this id, or insert it. Newest first, capped. */
export function upsertMatch(
  matches: ArchivedMatch[],
  entry: ArchivedMatch,
): ArchivedMatch[] {
  const without = matches.filter(m => m.id !== entry.id);
  return [entry, ...without]
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, MAX_ARCHIVED_MATCHES);
}

/**
 * Whether two archives are interchangeable, so the sync effect can skip a
 * redundant render and storage write.
 */
export function sameArchive(a: ArchivedMatch[], b: ArchivedMatch[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((entry, i) => JSON.stringify(entry) === JSON.stringify(b[i]));
}

// ─── Derived, for display ─────────────────────────────────────────────────────

/** "1h 04m" / "24m 10s" / "48s" — omits units that would read as zero. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

/**
 * How the result reads on a card. Casual is a single game, so its game tally
 * ("1 — 0") says nothing; show the points instead.
 */
export function resultLine(match: ArchivedMatch): string {
  if (match.matchMode === 'casual') {
    const only = match.games[match.games.length - 1];
    return only ? `${only.A} — ${only.B}` : '—';
  }
  return `${match.gamesWon.A} — ${match.gamesWon.B}`;
}

export function totalPoints(match: ArchivedMatch): number {
  return match.stats.A.pointsWon + match.stats.B.pointsWon;
}
