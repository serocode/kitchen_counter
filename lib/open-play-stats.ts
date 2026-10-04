/**
 * What an open play session adds up to: per-player form and streaks, the
 * session's standout moments, and the text and CSV an organiser can share.
 *
 * Everything here is derived from `results` alone and is pure — no clock, no
 * randomness — so the same games always read the same way.
 */

import { formatSkill, type MatchResult, type Pair, type Standing } from './open-play';

export type Outcome = 'W' | 'L';

/** How many recent games the form guide shows. */
export const FORM_LENGTH = 5;
/** A win streak shorter than this isn't worth a mention. */
export const MIN_NOTABLE_STREAK = 3;
/** Games two players need together before they count as a duo. */
export const MIN_DUO_GAMES = 2;

// ─── Per player ───────────────────────────────────────────────────────────────

export interface PlayerInsights {
  /** The run they are on now, or null before their first game. */
  streak: { kind: Outcome; count: number } | null;
  bestWinStreak: number;
  /** Their last few results, oldest → newest. */
  form: Outcome[];
  /** Games that had a score entered — the only ones points can be averaged over. */
  scoredGames: number;
  pointsFor: number;
  pointsAgainst: number;
  minutesPlayed: number;
  /** Mean time between one game ending and their next starting; null with fewer than two games. */
  avgWaitMinutes: number | null;
  /** The partner they win most with, once they have played together at least twice and won. */
  bestPartner: { id: string; games: number; wins: number } | null;
}

interface Accumulator {
  outcomes: Outcome[];
  scoredGames: number;
  pointsFor: number;
  pointsAgainst: number;
  minutesPlayed: number;
  lastEndedAt: number | null;
  waits: number[];
  partners: Map<string, { games: number; wins: number }>;
}

const minutesBetween = (from: number, to: number) => Math.max(0, to - from) / 60_000;

/** Results are read in the order stored: oldest → newest. */
export function getPlayerInsights(results: MatchResult[]): Map<string, PlayerInsights> {
  const accumulators = new Map<string, Accumulator>();
  const accumulatorFor = (id: string): Accumulator => {
    let acc = accumulators.get(id);
    if (!acc) {
      acc = {
        outcomes: [],
        scoredGames: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        minutesPlayed: 0,
        lastEndedAt: null,
        waits: [],
        partners: new Map(),
      };
      accumulators.set(id, acc);
    }
    return acc;
  };

  for (const result of results) {
    const length = minutesBetween(result.startedAt, result.endedAt);
    result.teams.forEach((team, side) => {
      const won = result.winner === side;
      team.forEach((id, index) => {
        const acc = accumulatorFor(id);
        acc.outcomes.push(won ? 'W' : 'L');
        acc.minutesPlayed += length;
        if (result.score) {
          acc.scoredGames += 1;
          acc.pointsFor += result.score[side];
          acc.pointsAgainst += result.score[1 - side];
        }
        if (acc.lastEndedAt !== null) acc.waits.push(minutesBetween(acc.lastEndedAt, result.startedAt));
        acc.lastEndedAt = result.endedAt;

        const partnerId = team[1 - index];
        const together = acc.partners.get(partnerId) ?? { games: 0, wins: 0 };
        together.games += 1;
        if (won) together.wins += 1;
        acc.partners.set(partnerId, together);
      });
    });
  }

  const insights = new Map<string, PlayerInsights>();
  for (const [id, acc] of accumulators) {
    let bestWinStreak = 0;
    let run = 0;
    for (const outcome of acc.outcomes) {
      run = outcome === 'W' ? run + 1 : 0;
      bestWinStreak = Math.max(bestWinStreak, run);
    }

    let streak: PlayerInsights['streak'] = null;
    const last = acc.outcomes[acc.outcomes.length - 1];
    if (last) {
      let count = 0;
      for (let i = acc.outcomes.length - 1; i >= 0 && acc.outcomes[i] === last; i--) count++;
      streak = { kind: last, count };
    }

    let bestPartner: PlayerInsights['bestPartner'] = null;
    for (const [partnerId, together] of acc.partners) {
      if (together.games < MIN_DUO_GAMES || together.wins === 0) continue;
      const better =
        !bestPartner ||
        together.wins / together.games > bestPartner.wins / bestPartner.games ||
        (together.wins / together.games === bestPartner.wins / bestPartner.games &&
          (together.games > bestPartner.games ||
            (together.games === bestPartner.games && partnerId < bestPartner.id)));
      if (better) bestPartner = { id: partnerId, ...together };
    }

    insights.set(id, {
      streak,
      bestWinStreak,
      form: acc.outcomes.slice(-FORM_LENGTH),
      scoredGames: acc.scoredGames,
      pointsFor: acc.pointsFor,
      pointsAgainst: acc.pointsAgainst,
      minutesPlayed: acc.minutesPlayed,
      avgWaitMinutes: acc.waits.length > 0 ? acc.waits.reduce((a, b) => a + b, 0) / acc.waits.length : null,
      bestPartner,
    });
  }
  return insights;
}

// ─── Whole session ────────────────────────────────────────────────────────────

export interface Duo {
  ids: Pair;
  games: number;
  wins: number;
}

export interface SessionHighlights {
  games: number;
  /** Players who finished at least one game. */
  players: number;
  /** First game starting to last game ending. */
  durationMinutes: number;
  avgGameMinutes: number;
  /** The longest unbeaten run, shared by everyone who had it — partners often do. */
  longestStreak: { playerIds: string[]; count: number } | null;
  /** The widest margin of any scored game. */
  biggestWin: { resultId: string; margin: number; winners: Pair; losers: Pair; score: [number, number] } | null;
  /** The pairs who won most together, best first. A pair that has only lost is not a top duo. */
  duos: Duo[];
}

const MAX_DUOS = 3;

const duoKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function getSessionHighlights(
  results: MatchResult[],
  insights: Map<string, PlayerInsights> = getPlayerInsights(results),
): SessionHighlights {
  let first = Infinity;
  let last = -Infinity;
  let gameMinutes = 0;
  let biggestWin: SessionHighlights['biggestWin'] = null;
  const duos = new Map<string, Duo>();

  for (const result of results) {
    first = Math.min(first, result.startedAt);
    last = Math.max(last, result.endedAt);
    gameMinutes += minutesBetween(result.startedAt, result.endedAt);

    if (result.score) {
      const margin = Math.abs(result.score[0] - result.score[1]);
      if (!biggestWin || margin > biggestWin.margin) {
        const winner = result.winner;
        biggestWin = {
          resultId: result.id,
          margin,
          winners: result.teams[winner],
          losers: result.teams[1 - winner],
          score: [result.score[winner], result.score[1 - winner]],
        };
      }
    }

    result.teams.forEach((team, side) => {
      const key = duoKey(team[0], team[1]);
      const duo = duos.get(key) ?? { ids: team, games: 0, wins: 0 };
      duo.games += 1;
      if (result.winner === side) duo.wins += 1;
      duos.set(key, duo);
    });
  }

  let longestStreak: SessionHighlights['longestStreak'] = null;
  for (const [id, insight] of insights) {
    if (insight.bestWinStreak < MIN_NOTABLE_STREAK) continue;
    if (!longestStreak || insight.bestWinStreak > longestStreak.count) {
      longestStreak = { playerIds: [id], count: insight.bestWinStreak };
    } else if (insight.bestWinStreak === longestStreak.count) {
      longestStreak.playerIds.push(id);
    }
  }

  return {
    games: results.length,
    players: insights.size,
    durationMinutes: results.length > 0 ? minutesBetween(first, last) : 0,
    avgGameMinutes: results.length > 0 ? gameMinutes / results.length : 0,
    longestStreak,
    biggestWin,
    duos: [...duos.values()]
      .filter(duo => duo.games >= MIN_DUO_GAMES && duo.wins > 0)
      .sort(
        (a, b) =>
          b.wins - a.wins ||
          b.wins / b.games - a.wins / a.games ||
          b.games - a.games ||
          duoKey(...a.ids).localeCompare(duoKey(...b.ids)),
      )
      .slice(0, MAX_DUOS),
  };
}

// ─── Sharing ──────────────────────────────────────────────────────────────────

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatDiff(diff: number): string {
  return diff > 0 ? `+${diff}` : diff < 0 ? `−${Math.abs(diff)}` : '0';
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export interface SessionReport {
  standings: Standing[];
  results: MatchResult[];
  highlights: SessionHighlights;
  playerName: (id: string) => string;
}

const pairNames = (pair: Pair, playerName: (id: string) => string) => pair.map(playerName).join(' & ');

/** The day the last game finished, in the reader's own format. */
export function sessionDateLabel(results: MatchResult[]): string {
  const last = results.reduce((latest, r) => Math.max(latest, r.endedAt), 0);
  return new Date(last).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/** A plain-text recap that reads well pasted into a group chat. */
export function formatSessionSummary({ standings, results, highlights, playerName }: SessionReport): string {
  const showDiff = results.some(r => r.score);
  const lines: string[] = [`Open play · ${sessionDateLabel(results)}`];

  const facts = [
    `${highlights.games} ${highlights.games === 1 ? 'game' : 'games'}`,
    `${highlights.players} ${highlights.players === 1 ? 'player' : 'players'}`,
    formatDuration(highlights.durationMinutes),
  ];
  lines.push(facts.join(' · '), '');

  const line = (row: Standing) => {
    const parts = [`${row.wins}–${row.losses}`, `${Math.round(row.winRate * 100)}%`];
    if (showDiff) parts.push(formatDiff(row.pointDiff));
    return `${row.player.name} — ${parts.join(' · ')}`;
  };

  const podium = standings.filter(row => row.rank <= 3);
  for (const row of podium) lines.push(`${MEDALS[row.rank]} ${line(row)}`);
  const rest = standings.filter(row => row.rank > 3);
  if (rest.length > 0) {
    lines.push('');
    for (const row of rest) lines.push(`${row.rank}. ${line(row)}`);
  }

  const extras: string[] = [];
  if (highlights.longestStreak) {
    const { playerIds, count } = highlights.longestStreak;
    extras.push(`Longest win streak: ${playerIds.map(playerName).join(' & ')} (${count})`);
  }
  if (highlights.biggestWin) {
    const { winners, losers, score } = highlights.biggestWin;
    extras.push(
      `Biggest win: ${pairNames(winners, playerName)} over ${pairNames(losers, playerName)}, ${score[0]}–${score[1]}`,
    );
  }
  for (const duo of highlights.duos.slice(0, 1)) {
    extras.push(`Top duo: ${pairNames(duo.ids, playerName)} (${duo.wins}–${duo.games - duo.wins})`);
  }
  if (extras.length > 0) lines.push('', ...extras.map(text => `• ${text}`));

  return lines.join('\n');
}

/** A spreadsheet cell holding text. A leading `=`, `+`, `-` or `@` would run as a formula, so it is defused. */
function textCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function clock(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Standings, then every game, as one CSV a spreadsheet can open. */
export function formatSessionCsv({ standings, results, playerName }: SessionReport): string {
  const rows: string[] = [
    'Standings',
    'Rank,Player,Rating,Games,Wins,Losses,Win %,Points for,Points against,Point diff',
    ...standings.map(row =>
      [
        row.rank,
        textCell(row.player.name),
        formatSkill(row.player.skill),
        row.games,
        row.wins,
        row.losses,
        Math.round(row.winRate * 100),
        row.pointsFor,
        row.pointsAgainst,
        row.pointDiff,
      ].join(','),
    ),
    '',
    'Games',
    'Finished,Court,Team 1,Team 2,Team 1 score,Team 2 score,Winner',
    ...results.map(result =>
      [
        clock(result.endedAt),
        textCell(result.courtName),
        textCell(pairNames(result.teams[0], playerName)),
        textCell(pairNames(result.teams[1], playerName)),
        result.score ? result.score[0] : '',
        result.score ? result.score[1] : '',
        result.winner === 0 ? 'Team 1' : 'Team 2',
      ].join(','),
    ),
  ];
  return rows.join('\r\n');
}

/** `kitchen-counter-open-play-2026-10-04.csv`, dated by the last game. */
export function sessionFileName(results: MatchResult[]): string {
  const last = results.reduce((latest, r) => Math.max(latest, r.endedAt), 0);
  return `kitchen-counter-open-play-${clock(last).slice(0, 10)}.csv`;
}
