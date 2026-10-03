/**
 * Open play: a roster of checked-in players rotating through several courts,
 * with every match built from the front of the queue and matched by skill.
 *
 * Every function here is pure. Anything random — ids, the pick between
 * equally good matchups — runs off a seed the caller passes in, so the same
 * action on the same state always lands in the same place. That keeps React's
 * StrictMode double invoke honest and makes the matcher reproducible.
 */

// ─── Skill levels ─────────────────────────────────────────────────────────────

/** The self-rating steps players already know from DUPR and club ladders. */
export const SKILL_LEVELS = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0] as const;

export const DEFAULT_SKILL = 3.0;

export function formatSkill(skill: number): string {
  return skill >= 5 ? '5.0+' : skill.toFixed(1);
}

export function skillTier(skill: number): string {
  if (skill < 3) return 'Beginner';
  if (skill < 4) return 'Intermediate';
  if (skill < 5) return 'Advanced';
  return 'Pro';
}

/** Snap any value onto the nearest skill step, falling back to the default. */
export function safeSkill(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SKILL;
  return SKILL_LEVELS.reduce<number>(
    (best, level) => (Math.abs(level - n) < Math.abs(best - n) ? level : best),
    SKILL_LEVELS[0],
  );
}

// ─── Matching modes ───────────────────────────────────────────────────────────

export type MatchingMode = 'skill' | 'balanced' | 'random';

export const MATCHING_MODES: Record<MatchingMode, { label: string; description: string }> = {
  skill: {
    label: 'Skill matched',
    description: 'Similar levels share a court, picked at random among close matches',
  },
  balanced: {
    label: 'Balanced',
    description: 'Strict queue order, strongest paired with weakest for even teams',
  },
  random: {
    label: 'Random',
    description: 'Anyone near the front of the line, teams drawn at random',
  },
};

export function safeMatchingMode(value: unknown): MatchingMode {
  return typeof value === 'string' && value in MATCHING_MODES ? (value as MatchingMode) : 'skill';
}

// ─── Types ────────────────────────────────────────────────────────────────────

export const PLAYERS_PER_MATCH = 4;
export const MAX_COURTS = 16;
export const MAX_NAME_LENGTH = 24;
/** How many undo steps we keep. Snapshots carry no photos, so they stay small. */
export const MAX_UNDO = 25;

export type Pair = [string, string];
/** Two teams of two player ids. Index 0 is "Team 1". */
export type Matchup = [Pair, Pair];

export interface OpenPlayer {
  id: string;
  name: string;
  skill: number;
  /** Checked in. False means sitting out: kept on the roster, out of the queue. */
  active: boolean;
  /** Place in line — lower plays sooner. Reassigned whenever they rejoin it. */
  queueSeq: number;
  /** Matches that started while this player waited. Reset when they play. */
  matchesWaited: number;
}

export interface CourtMatch {
  id: string;
  teams: Matchup;
  startedAt: number;
}

export interface Court {
  id: string;
  name: string;
  match: CourtMatch | null;
}

export interface MatchResult {
  id: string;
  courtName: string;
  teams: Matchup;
  /** Names at the time of play, so a removed player still reads correctly. */
  names: Record<string, string>;
  winner: 0 | 1;
  /** Final points, Team 1 first. Null when only the winner was recorded. */
  score: [number, number] | null;
  startedAt: number;
  endedAt: number;
}

export interface UndoEntry {
  label: string;
  /** The session as it was before the action. Its own history is empty. */
  snapshot: OpenPlaySession;
}

export interface OpenPlaySession {
  players: OpenPlayer[];
  courts: Court[];
  mode: MatchingMode;
  /** Put the next match on a court the moment its result is recorded. */
  autoStart: boolean;
  /** Finished matches, oldest → newest. All player stats derive from these. */
  results: MatchResult[];
  /** The staged next match, so the players can get ready before a court opens. */
  upNext: Matchup | null;
  nextSeq: number;
  history: UndoEntry[];
}

/** What every action needs from the outside world: the time, and a seed. */
export interface ActionContext {
  now: number;
  seed: number;
}

export interface PlayerDetails {
  name: string;
  skill: number;
}

export interface NewPlayer extends PlayerDetails {
  /** A caller-chosen id, so media stored outside the session (a photo) can be keyed to it. */
  id?: string;
}

// ─── Seeded randomness ────────────────────────────────────────────────────────

export type Rng = () => number;

/** mulberry32: tiny, fast, and plenty random for shuffling a queue. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeId(rng: Rng, now: number): string {
  return `${now.toString(36)}-${Math.floor(rng() * 0x7fffffff).toString(36)}`;
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

function makeCourt(index: number): Court {
  return { id: `court-${index + 1}`, name: `Court ${index + 1}`, match: null };
}

export function createSession(): OpenPlaySession {
  return {
    players: [],
    courts: [makeCourt(0), makeCourt(1)],
    mode: 'skill',
    autoStart: true,
    results: [],
    upNext: null,
    nextSeq: 0,
    history: [],
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function getOnCourtIds(session: OpenPlaySession): Set<string> {
  const ids = new Set<string>();
  for (const court of session.courts) {
    if (court.match) for (const id of court.match.teams.flat()) ids.add(id);
  }
  return ids;
}

/** Checked-in players who are not on a court, in the order they will play. */
export function getWaitingPlayers(session: OpenPlaySession): OpenPlayer[] {
  const onCourt = getOnCourtIds(session);
  return session.players
    .filter(p => p.active && !onCourt.has(p.id))
    .sort((a, b) => a.queueSeq - b.queueSeq);
}

export function getPlayerName(session: OpenPlaySession, id: string): string {
  const player = session.players.find(p => p.id === id);
  if (player) return player.name;
  for (let i = session.results.length - 1; i >= 0; i--) {
    const name = session.results[i].names[id];
    if (name) return name;
  }
  return 'Removed player';
}

export type PlayerStatus =
  | { kind: 'court'; courtName: string }
  | { kind: 'waiting'; position: number; upNext: boolean }
  | { kind: 'out' };

export function getPlayerStatuses(session: OpenPlaySession): Map<string, PlayerStatus> {
  const statuses = new Map<string, PlayerStatus>();
  for (const court of session.courts) {
    if (!court.match) continue;
    for (const id of court.match.teams.flat()) {
      statuses.set(id, { kind: 'court', courtName: court.name });
    }
  }
  const upNext = new Set(session.upNext?.flat() ?? []);
  getWaitingPlayers(session).forEach((p, index) => {
    statuses.set(p.id, { kind: 'waiting', position: index + 1, upNext: upNext.has(p.id) });
  });
  for (const p of session.players) {
    if (!statuses.has(p.id)) statuses.set(p.id, { kind: 'out' });
  }
  return statuses;
}

export interface PlayerRecord {
  games: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

const EMPTY_RECORD: PlayerRecord = { games: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };

export function getPlayerRecords(results: MatchResult[]): Map<string, PlayerRecord> {
  const records = new Map<string, PlayerRecord>();
  for (const result of results) {
    result.teams.forEach((team, side) => {
      const won = result.winner === side;
      for (const id of team) {
        const r = { ...(records.get(id) ?? EMPTY_RECORD) };
        r.games += 1;
        if (won) r.wins += 1;
        else r.losses += 1;
        if (result.score) {
          r.pointsFor += result.score[side];
          r.pointsAgainst += result.score[1 - side];
        }
        records.set(id, r);
      }
    });
  }
  return records;
}

export function getRecord(records: Map<string, PlayerRecord>, id: string): PlayerRecord {
  return records.get(id) ?? EMPTY_RECORD;
}

export interface Standing extends PlayerRecord {
  player: OpenPlayer;
  rank: number;
  /** 0–1. */
  winRate: number;
  pointDiff: number;
}

/**
 * Players who have played at least once, ranked by wins, then win rate, then
 * point differential. Exact ties share a rank.
 */
export function getStandings(session: OpenPlaySession): Standing[] {
  const records = getPlayerRecords(session.results);
  const rows = session.players
    .map(player => {
      const r = getRecord(records, player.id);
      return {
        ...r,
        player,
        rank: 0,
        winRate: r.games > 0 ? r.wins / r.games : 0,
        pointDiff: r.pointsFor - r.pointsAgainst,
      };
    })
    .filter(row => row.games > 0)
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.winRate - a.winRate ||
        b.pointDiff - a.pointDiff ||
        a.player.name.localeCompare(b.player.name),
    );

  rows.forEach((row, index) => {
    const prev = rows[index - 1];
    const tied =
      prev &&
      prev.wins === row.wins &&
      prev.winRate === row.winRate &&
      prev.pointDiff === row.pointDiff;
    row.rank = tied ? prev.rank : index + 1;
  });
  return rows;
}

// ─── Matchmaking ──────────────────────────────────────────────────────────────

interface Weights {
  /** How far down the queue a match may reach for a better fit. */
  window: number;
  /** Cost per queue position used — prefers whoever has waited longest. */
  wait: number;
  /** Cost per rating point between the strongest and weakest of the four. */
  spread: number;
  /** Cost per rating point between the two teams' combined skill. */
  balance: number;
  /** Cost per previous game a pair of partners has already played together. */
  partner: number;
  /** Cost per previous game two players have already faced each other. */
  opponent: number;
  /** Scale of the random nudge that picks between near-equal options. */
  jitter: number;
}

const WEIGHTS: Record<MatchingMode, Weights> = {
  skill: { window: 10, wait: 0.35, spread: 3, balance: 2, partner: 1.5, opponent: 0.5, jitter: 1 },
  balanced: { window: 6, wait: 1.5, spread: 0, balance: 3, partner: 2, opponent: 0.5, jitter: 0.5 },
  random: { window: 8, wait: 0.3, spread: 0, balance: 0, partner: 1, opponent: 0.3, jitter: 4 },
};

/**
 * Cost of skipping a player, scaled by the square of the matches they have
 * already sat through. Shared by every mode: someone who just sat out should
 * not sit again because a better skill fit turned up behind them, and the
 * square makes sure a lone 5.0 in a 3.0 crowd gets on within a match or two
 * instead of waiting for a peer who never arrives.
 */
const DUE_WEIGHT = 4;

const dueCost = (p: OpenPlayer) => p.matchesWaited * p.matchesWaited;

/**
 * Cost per pair of the four who were on the same court in their last game.
 * Without it, four players who come off a court together queue together and
 * go straight back on together — open play's classic "stuck foursome".
 */
const RECENT_WEIGHT = 1.5;

/**
 * Cost per game a player has played beyond the least-played in the pool,
 * capped so a late arrival evens out gently rather than jumping the line.
 * This decides who gets a back-to-back game when only a few are waiting.
 */
const GAMES_WEIGHT = 1.5;
const GAMES_CAP = 2;

/** The three ways to split four players into two teams of two. */
const SPLITS = [
  [0, 1, 2, 3],
  [0, 2, 1, 3],
  [0, 3, 1, 2],
] as const;

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function bump(map: Map<string, number>, a: string, b: string) {
  const key = pairKey(a, b);
  map.set(key, (map.get(key) ?? 0) + 1);
}

function pairingHistory(results: MatchResult[]) {
  const partners = new Map<string, number>();
  const opponents = new Map<string, number>();
  for (const { teams } of results) {
    for (const [a, b] of teams) bump(partners, a, b);
    for (const a of teams[0]) for (const b of teams[1]) bump(opponents, a, b);
  }
  return { partners, opponents };
}

/** For each player, the three others who shared their most recent game. */
function lastCourtmates(results: MatchResult[]): Map<string, Set<string>> {
  const courtmates = new Map<string, Set<string>>();
  for (const { teams } of results) {
    const ids = teams.flat();
    for (const id of ids) courtmates.set(id, new Set(ids.filter(other => other !== id)));
  }
  return courtmates;
}

/** How many of the six pairs among four players shared their last game. */
function countRecentPairs(ids: string[], courtmates: Map<string, Set<string>>): number {
  let pairs = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (courtmates.get(ids[i])?.has(ids[j])) pairs++;
    }
  }
  return pairs;
}

/**
 * Build the next match from the waiting queue, or null with fewer than four.
 *
 * The player at the front of the line always plays, so nobody can be passed
 * over forever. The other three come from a window behind them, and the
 * split into teams is chosen at the same time, by scoring every option on
 * wait time, skill spread, team balance and repeat pairings. A seeded jitter
 * breaks near-ties, which is what makes the matching feel random rather than
 * the same four players every time.
 */
export function proposeMatch(session: OpenPlaySession, rng: Rng): Matchup | null {
  const waiting = getWaitingPlayers(session);
  if (waiting.length < PLAYERS_PER_MATCH) return null;

  const w = WEIGHTS[session.mode];
  const pool = waiting.slice(0, Math.max(PLAYERS_PER_MATCH, w.window));
  const { partners, opponents } = pairingHistory(session.results);
  const courtmates = lastCourtmates(session.results);
  const count = (map: Map<string, number>, a: string, b: string) => map.get(pairKey(a, b)) ?? 0;
  const dueInPool = pool.reduce((sum, p) => sum + dueCost(p), 0);
  const records = getPlayerRecords(session.results);
  const games = new Map(pool.map(p => [p.id, getRecord(records, p.id).games]));
  const fewestGames = Math.min(...games.values());
  const extraGames = (p: OpenPlayer) => Math.min(GAMES_CAP, (games.get(p.id) ?? 0) - fewestGames);

  let best: { cost: number; teams: Matchup } | null = null;

  for (let i = 1; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      for (let k = j + 1; k < pool.length; k++) {
        const group = [pool[0], pool[i], pool[j], pool[k]];
        const skills = group.map(p => p.skill);
        const spread = Math.max(...skills) - Math.min(...skills);
        const skippedDue = dueInPool - group.reduce((sum, p) => sum + dueCost(p), 0);
        const recentPairs = countRecentPairs(group.map(p => p.id), courtmates);
        const baseCost =
          w.wait * (i + j + k) +
          DUE_WEIGHT * skippedDue +
          RECENT_WEIGHT * recentPairs +
          GAMES_WEIGHT * group.reduce((sum, p) => sum + extraGames(p), 0) +
          w.spread * spread;

        for (const [a, b, c, d] of SPLITS) {
          const t1 = [group[a], group[b]];
          const t2 = [group[c], group[d]];
          const balance = Math.abs(t1[0].skill + t1[1].skill - t2[0].skill - t2[1].skill);
          const partnerRepeats = count(partners, t1[0].id, t1[1].id) + count(partners, t2[0].id, t2[1].id);
          let opponentRepeats = 0;
          for (const x of t1) for (const y of t2) opponentRepeats += count(opponents, x.id, y.id);

          const cost =
            baseCost +
            w.balance * balance +
            w.partner * partnerRepeats +
            w.opponent * opponentRepeats +
            w.jitter * rng();

          if (!best || cost < best.cost) {
            best = { cost, teams: [[t1[0].id, t1[1].id], [t2[0].id, t2[1].id]] };
          }
        }
      }
    }
  }

  return best?.teams ?? null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Bring the staged match back in line after any change: drop it when its
 * players are no longer all waiting, and stage a new one when possible.
 */
function settle(session: OpenPlaySession, rng: Rng, reshuffle = false): OpenPlaySession {
  const waitingIds = new Set(getWaitingPlayers(session).map(p => p.id));
  let upNext = session.upNext;
  if (reshuffle || (upNext && !upNext.flat().every(id => waitingIds.has(id)))) upNext = null;
  if (!upNext) upNext = proposeMatch(session, rng);
  return { ...session, upNext };
}

/** Snapshot `prev` onto the undo stack of the state that replaces it. */
function withUndo(prev: OpenPlaySession, next: OpenPlaySession, label: string): OpenPlaySession {
  const snapshot = { ...prev, history: [] };
  return { ...next, history: [...prev.history, { label, snapshot }].slice(-MAX_UNDO) };
}

/** Put the staged match on a court. Everyone left waiting has now sat one out. */
function dispatchUpNext(session: OpenPlaySession, courtId: string, now: number, rng: Rng): OpenPlaySession {
  const matchup = session.upNext;
  if (!matchup) return session;
  const chosen = new Set(matchup.flat());
  const waitingIds = new Set(getWaitingPlayers(session).map(p => p.id));

  return {
    ...session,
    courts: session.courts.map(c =>
      c.id === courtId ? { ...c, match: { id: makeId(rng, now), teams: matchup, startedAt: now } } : c,
    ),
    players: session.players.map(p => {
      if (chosen.has(p.id)) return { ...p, matchesWaited: 0 };
      if (waitingIds.has(p.id)) return { ...p, matchesWaited: p.matchesWaited + 1 };
      return p;
    }),
    upNext: null,
  };
}

function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/** Check new players in. Each joins the back of the line. */
export function addPlayers(session: OpenPlaySession, entries: NewPlayer[], ctx: ActionContext): OpenPlaySession {
  const rng = createRng(ctx.seed);
  let seq = session.nextSeq;
  const taken = new Set(session.players.map(p => p.id));
  const added: OpenPlayer[] = [];
  for (const entry of entries) {
    const name = cleanName(entry.name);
    if (!name) continue;
    const id = entry.id && !taken.has(entry.id) ? entry.id : makeId(rng, ctx.now);
    taken.add(id);
    added.push({
      id,
      name,
      skill: safeSkill(entry.skill),
      active: true,
      queueSeq: seq++,
      matchesWaited: 0,
    });
  }
  if (added.length === 0) return session;
  return settle({ ...session, players: [...session.players, ...added], nextSeq: seq }, rng);
}

export function updatePlayer(
  session: OpenPlaySession,
  id: string,
  changes: Partial<PlayerDetails>,
  ctx: ActionContext,
): OpenPlaySession {
  const current = session.players.find(p => p.id === id);
  if (!current) return session;
  const name = changes.name === undefined ? current.name : cleanName(changes.name) || current.name;
  const skill = changes.skill === undefined ? current.skill : safeSkill(changes.skill);
  const next = { ...session, players: session.players.map(p => (p.id === id ? { ...p, name, skill } : p)) };
  // A new rating can make the staged match a poor fit, so draw it again.
  const restage = skill !== current.skill && Boolean(session.upNext?.flat().includes(id));
  return settle(next, createRng(ctx.seed), restage);
}

/** Check a player in (to the back of the line) or sit them out. */
export function setPlayerActive(
  session: OpenPlaySession,
  id: string,
  active: boolean,
  ctx: ActionContext,
): OpenPlaySession {
  const player = session.players.find(p => p.id === id);
  if (!player || player.active === active) return session;
  // Someone mid-game finishes it; the result returns them to the queue.
  if (!active && getOnCourtIds(session).has(id)) return session;

  const next: OpenPlaySession = {
    ...session,
    players: session.players.map(p =>
      p.id !== id ? p : active ? { ...p, active, queueSeq: session.nextSeq, matchesWaited: 0 } : { ...p, active },
    ),
    nextSeq: active ? session.nextSeq + 1 : session.nextSeq,
  };
  return settle(next, createRng(ctx.seed));
}

export function removePlayer(session: OpenPlaySession, id: string, ctx: ActionContext): OpenPlaySession {
  const player = session.players.find(p => p.id === id);
  if (!player || getOnCourtIds(session).has(id)) return session;
  const next = { ...session, players: session.players.filter(p => p.id !== id) };
  return withUndo(session, settle(next, createRng(ctx.seed)), `Remove ${player.name}`);
}

/** Add or remove courts at the end. A court with a match on it is never removed. */
export function setCourtCount(session: OpenPlaySession, count: number, ctx: ActionContext): OpenPlaySession {
  const target = Math.max(1, Math.min(MAX_COURTS, Math.round(count)));
  const courts = [...session.courts];
  while (courts.length < target) courts.push(makeCourt(courts.length));
  while (courts.length > target && !courts[courts.length - 1].match) courts.pop();
  if (courts.length === session.courts.length) return session;
  return settle({ ...session, courts }, createRng(ctx.seed));
}

export function setMatchingMode(session: OpenPlaySession, mode: MatchingMode, ctx: ActionContext): OpenPlaySession {
  if (session.mode === mode) return session;
  return settle({ ...session, mode: safeMatchingMode(mode) }, createRng(ctx.seed), true);
}

export function setAutoStart(session: OpenPlaySession, autoStart: boolean): OpenPlaySession {
  return { ...session, autoStart };
}

/** Draw the staged match again. */
export function shuffleUpNext(session: OpenPlaySession, ctx: ActionContext): OpenPlaySession {
  return settle(session, createRng(ctx.seed), true);
}

/** Send the staged match to an open court. */
export function startMatch(session: OpenPlaySession, courtId: string, ctx: ActionContext): OpenPlaySession {
  const rng = createRng(ctx.seed);
  const court = session.courts.find(c => c.id === courtId);
  if (!court || court.match) return session;
  const staged = settle(session, rng);
  if (!staged.upNext) return session;
  const next = settle(dispatchUpNext(staged, courtId, ctx.now, rng), rng);
  return withUndo(session, next, `Start ${court.name}`);
}

/** Fill every open court in order, for as long as there are players to fill them. */
export function fillOpenCourts(session: OpenPlaySession, ctx: ActionContext): OpenPlaySession {
  const rng = createRng(ctx.seed);
  let next = settle(session, rng);
  let started = 0;
  for (const court of session.courts) {
    if (court.match || !next.upNext) continue;
    next = settle(dispatchUpNext(next, court.id, ctx.now, rng), rng);
    started++;
  }
  if (started === 0) return session;
  return withUndo(session, next, started === 1 ? 'Start match' : `Start ${started} matches`);
}

/**
 * Record a finished match. The four players go to the back of the line in a
 * random order, and with auto-start on, the staged match takes the court.
 */
export function finishMatch(
  session: OpenPlaySession,
  courtId: string,
  winner: 0 | 1,
  score: [number, number] | null,
  ctx: ActionContext,
): OpenPlaySession {
  const rng = createRng(ctx.seed);
  const court = session.courts.find(c => c.id === courtId);
  const match = court?.match;
  if (!court || !match) return session;

  const ids = match.teams.flat();
  let seq = session.nextSeq;
  const requeue = new Map(shuffle(ids, rng).map(id => [id, seq++]));
  const names = Object.fromEntries(ids.map(id => [id, getPlayerName(session, id)]));

  let next: OpenPlaySession = {
    ...session,
    players: session.players.map(p => {
      const queueSeq = requeue.get(p.id);
      return queueSeq === undefined ? p : { ...p, queueSeq, matchesWaited: 0 };
    }),
    courts: session.courts.map(c => (c.id === courtId ? { ...c, match: null } : c)),
    results: [
      ...session.results,
      {
        id: match.id,
        courtName: court.name,
        teams: match.teams,
        names,
        winner,
        score,
        startedAt: match.startedAt,
        endedAt: ctx.now,
      },
    ],
    nextSeq: seq,
  };

  // A staged foursome that all came off the same court was usually staged
  // because nobody else was waiting. Now four more are, so draw it again.
  const staged = next.upNext;
  const rematch =
    staged !== null && countRecentPairs(staged.flat(), lastCourtmates(next.results)) === 6;

  next = settle(next, rng, rematch);
  if (next.autoStart && next.upNext) next = settle(dispatchUpNext(next, courtId, ctx.now, rng), rng);
  return withUndo(session, next, `${court.name} result`);
}

/** Take a match off its court without a result. Its players go back to the front. */
export function cancelMatch(session: OpenPlaySession, courtId: string, ctx: ActionContext): OpenPlaySession {
  const court = session.courts.find(c => c.id === courtId);
  const match = court?.match;
  if (!court || !match) return session;

  const waiting = getWaitingPlayers(session);
  const front = waiting.length > 0 ? waiting[0].queueSeq : session.nextSeq;
  // Outrank anyone already due, so "front of the line" survives the matcher.
  const priority = Math.max(0, ...waiting.map(p => p.matchesWaited)) + 1;
  const ids = match.teams.flat();

  const next: OpenPlaySession = {
    ...session,
    players: session.players.map(p => {
      const index = ids.indexOf(p.id);
      return index === -1 ? p : { ...p, queueSeq: front - ids.length + index, matchesWaited: priority };
    }),
    courts: session.courts.map(c => (c.id === courtId ? { ...c, match: null } : c)),
  };
  return withUndo(session, settle(next, createRng(ctx.seed), true), `Cancel ${court.name}`);
}

export function deleteResult(session: OpenPlaySession, resultId: string): OpenPlaySession {
  if (!session.results.some(r => r.id === resultId)) return session;
  const next = { ...session, results: session.results.filter(r => r.id !== resultId) };
  return withUndo(session, next, 'Delete result');
}

/**
 * Start over. Keeping the roster clears games, standings and the courts but
 * keeps everyone checked in, in their current order. Either way the court
 * count and matching settings survive — they describe the venue, not the day.
 */
export function resetSession(session: OpenPlaySession, keepRoster: boolean, ctx: ActionContext): OpenPlaySession {
  const fresh: OpenPlaySession = {
    ...createSession(),
    courts: session.courts.map(c => ({ ...c, match: null })),
    mode: session.mode,
    autoStart: session.autoStart,
  };
  if (!keepRoster) return fresh;

  const ordered = [...session.players].sort((a, b) => a.queueSeq - b.queueSeq);
  return settle(
    {
      ...fresh,
      players: ordered.map((p, index) => ({ ...p, queueSeq: index, matchesWaited: 0 })),
      nextSeq: ordered.length,
    },
    createRng(ctx.seed),
  );
}

export function undoLast(session: OpenPlaySession): OpenPlaySession {
  const entry = session.history[session.history.length - 1];
  if (!entry) return session;
  return { ...entry.snapshot, history: session.history.slice(0, -1) };
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isMatchup(value: unknown): value is Matchup {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(team => Array.isArray(team) && team.length === 2 && team.every(isString))
  );
}

function parsePlayer(raw: unknown): OpenPlayer | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<OpenPlayer>;
  if (!isString(p.id) || !isString(p.name)) return null;
  return {
    id: p.id,
    name: cleanName(p.name) || 'Player',
    skill: safeSkill(p.skill),
    active: p.active !== false,
    queueSeq: isNumber(p.queueSeq) ? p.queueSeq : 0,
    matchesWaited: isNumber(p.matchesWaited) ? p.matchesWaited : 0,
  };
}

function parseResult(raw: unknown): MatchResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<MatchResult>;
  if (!isString(r.id) || !isMatchup(r.teams) || (r.winner !== 0 && r.winner !== 1)) return null;
  const score =
    Array.isArray(r.score) && r.score.length === 2 && r.score.every(isNumber)
      ? ([r.score[0], r.score[1]] as [number, number])
      : null;
  return {
    id: r.id,
    courtName: isString(r.courtName) ? r.courtName : 'Court',
    teams: r.teams,
    names: r.names && typeof r.names === 'object' ? r.names : {},
    winner: r.winner,
    score,
    startedAt: isNumber(r.startedAt) ? r.startedAt : 0,
    endedAt: isNumber(r.endedAt) ? r.endedAt : 0,
  };
}

function parseSnapshot(raw: unknown): OpenPlaySession {
  const base = createSession();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<OpenPlaySession>;

  const players = (Array.isArray(r.players) ? r.players : [])
    .map(parsePlayer)
    .filter((p): p is OpenPlayer => p !== null);
  const known = new Set(players.map(p => p.id));
  const allKnown = (m: Matchup) => m.flat().every(id => known.has(id));

  const courts: Court[] = (Array.isArray(r.courts) ? r.courts : [])
    .filter((c): c is Court => Boolean(c) && isString(c.id) && isString(c.name))
    .slice(0, MAX_COURTS)
    .map(c => ({
      id: c.id,
      name: c.name,
      match:
        c.match && isString(c.match.id) && isMatchup(c.match.teams) && allKnown(c.match.teams)
          ? { id: c.match.id, teams: c.match.teams, startedAt: isNumber(c.match.startedAt) ? c.match.startedAt : 0 }
          : null,
    }));

  return {
    players,
    courts: courts.length > 0 ? courts : base.courts,
    mode: safeMatchingMode(r.mode),
    autoStart: r.autoStart !== false,
    results: (Array.isArray(r.results) ? r.results : [])
      .map(parseResult)
      .filter((x): x is MatchResult => x !== null),
    upNext: isMatchup(r.upNext) && allKnown(r.upNext) ? r.upNext : null,
    nextSeq: Math.max(isNumber(r.nextSeq) ? r.nextSeq : 0, ...players.map(p => p.queueSeq + 1)),
    history: [],
  };
}

/** Rebuild a session from storage, dropping anything malformed. */
export function parseSession(raw: unknown, seed: number): OpenPlaySession {
  const session = parseSnapshot(raw);
  const rawHistory = raw && typeof raw === 'object' ? (raw as Partial<OpenPlaySession>).history : undefined;
  const history: UndoEntry[] = (Array.isArray(rawHistory) ? rawHistory : [])
    .filter(e => e && isString(e.label) && e.snapshot && typeof e.snapshot === 'object')
    .slice(-MAX_UNDO)
    .map(e => ({ label: e.label, snapshot: parseSnapshot(e.snapshot) }));
  return settle({ ...session, history }, createRng(seed));
}
