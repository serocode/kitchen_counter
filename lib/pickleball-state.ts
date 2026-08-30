export interface Player {
  name: string;
  photo?: string; // base64 encoded image
}

export type MatchMode = 'casual' | 'standard' | 'long';

export interface MatchModeConfig {
  gamesToWin: number;
  totalGames: number;
  label: string;
  description: string;
}

export const MATCH_MODES: Record<MatchMode, MatchModeConfig> = {
  casual: { gamesToWin: 1, totalGames: 1, label: 'Casual', description: '1 game to 11' },
  standard: { gamesToWin: 2, totalGames: 3, label: 'Standard', description: 'Best of 3 to 11' },
  long: { gamesToWin: 3, totalGames: 5, label: 'Long', description: 'Best of 5 to 11' },
};

/** Points needed to win a game, and the margin required. */
export const POINTS_TO_WIN = 11;
export const WIN_BY = 2;

/** How many undo steps we keep. Bounded so state never grows without limit. */
export const MAX_UNDO = 25;

export interface Team {
  name: string;
  score: number;
  players: [Player, Player]; // index 0 = even/right-court player at game start
}

export interface ServingState {
  team: 'A' | 'B';
  serverNumber: 1 | 2;
  isFirstServe: boolean;
}

// ─── Cumulative per-team stats across all games in a match ─────────────────────
export interface MatchStats {
  pointsWon: number;
  faults: number;
  sideOuts: number;
}

export interface GameEvent {
  id: string;
  type: 'point' | 'fault' | 'sideout' | 'game';
  team: 'A' | 'B';
  server: 1 | 2;
  score: string; // "X-Y-Z" format (servingScore-receivingScore-serverNumber)
  scoreAfter: { A: number; B: number };
  serverAfter: { team: 'A' | 'B'; serverNumber: 1 | 2 };
  game: number;
  timestamp: number;
}

export interface GameState {
  teams: {
    A: Team;
    B: Team;
  };
  serving: ServingState;
  matchMode: MatchMode;
  gamesWon: { A: number; B: number };
  currentGame: number;
  isMatchStarted: boolean;
  isMatchOver: boolean;
  matchStats: { A: MatchStats; B: MatchStats };
  events: GameEvent[];
  /** Undo stack, oldest → newest. Each entry has an empty stack of its own. */
  gameHistory: GameState[];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const EMPTY_MATCH_STATS: MatchStats = { pointsWon: 0, faults: 0, sideOuts: 0 };

const INITIAL_GAME_STATE: GameState = {
  teams: {
    A: {
      name: 'Team A',
      score: 0,
      players: [
        { name: 'Player 1A' },
        { name: 'Player 2A' },
      ],
    },
    B: {
      name: 'Team B',
      score: 0,
      players: [
        { name: 'Player 1B' },
        { name: 'Player 2B' },
      ],
    },
  },
  // The first serving team of a game only gets one server; calling them
  // "server 2" makes the first fault a side-out, per the official rule.
  serving: { team: 'A', serverNumber: 2, isFirstServe: true },
  matchMode: 'casual',
  gamesWon: { A: 0, B: 0 },
  currentGame: 1,
  isMatchStarted: false,
  isMatchOver: false,
  matchStats: {
    A: { ...EMPTY_MATCH_STATS },
    B: { ...EMPTY_MATCH_STATS },
  },
  events: [],
  gameHistory: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function otherTeam(team: 'A' | 'B'): 'A' | 'B' {
  return team === 'A' ? 'B' : 'A';
}

/**
 * Coerce any string to a valid MatchMode, falling back to 'casual'.
 * This prevents runtime crashes when form state or persisted data
 * contains an unexpected / empty value.
 */
export function safeMatchMode(value: string | undefined | null): MatchMode {
  if (value && value in MATCH_MODES) return value as MatchMode;
  return 'casual';
}

/** Generate a short unique ID for events. */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Ensure matchStats exists on a deserialized state.
 * Older persisted states may not have matchStats.
 */
export function ensureMatchStats(state: GameState): GameState {
  if (!state.matchStats) {
    // Rebuild stats from events if they exist
    const stats = { A: { ...EMPTY_MATCH_STATS }, B: { ...EMPTY_MATCH_STATS } };
    for (const event of (state.events || [])) {
      if (event.type === 'point') {
        stats[event.team].pointsWon++;
      } else if (event.type === 'fault') {
        stats[event.team].faults++;
      } else if (event.type === 'sideout') {
        stats[event.team].sideOuts++;
      }
    }
    return { ...state, matchStats: stats };
  }
  return state;
}

/**
 * Snapshot `prev` onto the undo stack of a state being built.
 * The snapshot carries an empty stack of its own, so history stays flat
 * and bounded instead of nesting a full copy on every action.
 */
function pushHistory(prev: GameState, next: GameState): GameState {
  const snapshot = { ...clone(prev), gameHistory: [] as GameState[] };
  next.gameHistory = [...(prev.gameHistory ?? []), snapshot].slice(-MAX_UNDO);
  return next;
}

/** Start a mutation: deep copy, normalise legacy fields, snapshot for undo. */
function beginAction(state: GameState): GameState {
  const next = clone(state);
  next.matchMode = safeMatchMode(next.matchMode);
  next.gamesWon = { A: next.gamesWon?.A ?? 0, B: next.gamesWon?.B ?? 0 };
  next.currentGame = next.currentGame ?? 1;
  if (!next.matchStats) {
    next.matchStats = { A: { ...EMPTY_MATCH_STATS }, B: { ...EMPTY_MATCH_STATS } };
  }
  next.isMatchStarted = true;
  return pushHistory(state, next);
}

// ─── Position helpers ─────────────────────────────────────────────────────────

/**
 * The server's number for positioning purposes.
 *
 * The opening service sequence of a game is called "server 2" so that the
 * first fault is a side-out, but that player stands where a first server
 * stands. Every other sequence uses the real number.
 */
export function getEffectiveServerNumber(state: GameState): 1 | 2 {
  return state.serving.isFirstServe ? 1 : state.serving.serverNumber;
}

/**
 * Which side of the court the current server stands on.
 *
 * The score fixes where the game's *first* server stands — right when the
 * team's score is even, left when odd. The second server is their partner,
 * and partners only swap courts when their team scores, never on a fault.
 * So the second server stands in the opposite court, and the serving side
 * flips with the server number as well as with the score.
 */
export function getServerPosition(state: GameState): 'right' | 'left' {
  const isEvenScore = state.teams[state.serving.team].score % 2 === 0;
  const isFirstServer = getEffectiveServerNumber(state) === 1;
  return isEvenScore === isFirstServer ? 'right' : 'left';
}

/**
 * Index (0 or 1) of the player currently serving.
 * Teams rotate on every point they win, so the array order already encodes
 * position: index 0 is the left/odd court, index 1 the right/even court.
 */
export function getServingPlayerIndex(state: GameState): 0 | 1 {
  return getServerPosition(state) === 'right' ? 1 : 0;
}

/** The player who should be receiving — diagonally opposite the server. */
export function getReceivingPlayerIndex(state: GameState): 0 | 1 {
  // A serve from the right/even court is taken in the receiver's right/even
  // court, which is the box diagonally across the net.
  return getServerPosition(state) === 'right' ? 1 : 0;
}

/** Rotate serving team's positions when they score. */
export function rotatePositions(team: Team): Team {
  return {
    ...team,
    players: [team.players[1], team.players[0]],
  };
}

// ─── Score Call Formatting ────────────────────────────────────────────────────

/** Format a score call string as "servingScore-receivingScore-serverNumber" */
function formatScoreCall(
  servingTeamScore: number,
  receivingTeamScore: number,
  serverNumber: 1 | 2,
): string {
  return `${servingTeamScore}-${receivingTeamScore}-${serverNumber}`;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/** Award a point to the serving team (side-out scoring: only they can score). */
export function scorePoint(state: GameState): GameState {
  // Refuse to score past the end of a game or match — keeps stats honest
  // even if a caller forgets to disable the button.
  if (isGameWon(state).isWon || state.isMatchOver) return state;

  const newState = beginAction(state);

  const servingTeamKey = newState.serving.team;
  const receivingTeamKey = otherTeam(servingTeamKey);
  newState.teams[servingTeamKey].score += 1;
  newState.teams[servingTeamKey] = rotatePositions(newState.teams[servingTeamKey]);
  newState.matchStats[servingTeamKey].pointsWon += 1;

  const scoreStr = formatScoreCall(
    newState.teams[servingTeamKey].score,
    newState.teams[receivingTeamKey].score,
    newState.serving.serverNumber,
  );

  newState.events = [
    ...newState.events,
    {
      id: generateId(),
      type: 'point',
      team: servingTeamKey,
      server: newState.serving.serverNumber,
      score: scoreStr,
      scoreAfter: { A: newState.teams.A.score, B: newState.teams.B.score },
      serverAfter: { team: newState.serving.team, serverNumber: newState.serving.serverNumber },
      game: newState.currentGame,
      timestamp: Date.now(),
    },
  ];

  // Credit the game as soon as it is won, and close out the match if this
  // was the deciding game.
  const gameWinCheck = isGameWon(newState);
  if (gameWinCheck.isWon && gameWinCheck.winner) {
    newState.gamesWon = { ...newState.gamesWon };
    newState.gamesWon[gameWinCheck.winner] += 1;
    newState.isMatchOver = isMatchWon(newState).isWon;
  }

  return newState;
}

/** Serving team lost the rally: second server, or side-out. */
export function recordFault(state: GameState): GameState {
  if (isGameWon(state).isWon || state.isMatchOver) return state;

  const newState = beginAction(state);

  const currentServingTeam = newState.serving.team;
  const receivingTeam = otherTeam(currentServingTeam);

  let eventType: GameEvent['type'] = 'fault';

  if (newState.serving.serverNumber === 1) {
    // First server lost — serve passes to the partner.
    newState.serving.serverNumber = 2;
    newState.matchStats[currentServingTeam].faults += 1;
  } else {
    // Second server lost — side-out to the other team.
    newState.serving.team = receivingTeam;
    newState.serving.serverNumber = 1;
    newState.serving.isFirstServe = false;
    eventType = 'sideout';
    newState.matchStats[currentServingTeam].sideOuts += 1;
  }

  const servingNow = newState.serving.team;
  const receivingNow = otherTeam(servingNow);
  const scoreStr = formatScoreCall(
    newState.teams[servingNow].score,
    newState.teams[receivingNow].score,
    newState.serving.serverNumber,
  );

  newState.events = [
    ...newState.events,
    {
      id: generateId(),
      type: eventType,
      team: currentServingTeam,
      server: state.serving.serverNumber,
      score: scoreStr,
      scoreAfter: { A: newState.teams.A.score, B: newState.teams.B.score },
      serverAfter: { team: newState.serving.team, serverNumber: newState.serving.serverNumber },
      game: newState.currentGame,
      timestamp: Date.now(),
    },
  ];

  return newState;
}

/** Full reset — factory defaults, nothing carried over. */
export function resetGame(): GameState {
  return clone(INITIAL_GAME_STATE);
}

/** Reset scores and history but keep teams, players and match mode. */
export function resetGameKeepSettings(state: GameState): GameState {
  const base = clone(INITIAL_GAME_STATE);
  base.teams.A.name = state.teams.A.name;
  base.teams.B.name = state.teams.B.name;
  base.teams.A.players = clone(state.teams.A.players);
  base.teams.B.players = clone(state.teams.B.players);
  base.matchMode = safeMatchMode(state.matchMode);
  return base;
}

/** Step back one action. */
export function undoLastAction(state: GameState): GameState {
  const stack = state.gameHistory ?? [];
  if (stack.length === 0) return state;
  const previous = stack[stack.length - 1];
  return { ...clone(previous), gameHistory: stack.slice(0, -1) };
}

/**
 * Apply match settings. Changing the match mode mid-match can make an
 * already-recorded games-won tally decisive (or no longer decisive), so
 * the match-over flag is recomputed rather than left stale.
 */
export function applyMatchSettings(
  state: GameState,
  settings: {
    teamAName: string;
    teamBName: string;
    teamAPlayers: [Player, Player];
    teamBPlayers: [Player, Player];
    matchMode: MatchMode;
  },
): GameState {
  const next = clone(state);
  next.matchMode = safeMatchMode(settings.matchMode);
  next.teams.A.name = settings.teamAName.trim() || 'Team A';
  next.teams.B.name = settings.teamBName.trim() || 'Team B';
  next.teams.A.players = clone(settings.teamAPlayers);
  next.teams.B.players = clone(settings.teamBPlayers);
  next.isMatchOver = isMatchWon(next).isWon;
  return next;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** The full score call, e.g. 7-5-1 (serving-receiving-server). */
export function getScoreCall(state: GameState): {
  servingTeamScore: number;
  receivingTeamScore: number;
  serverNumber: 1 | 2;
  servingTeam: 'A' | 'B';
} {
  const servingTeam = state.serving.team;
  const receivingTeam = otherTeam(servingTeam);

  return {
    servingTeamScore: state.teams[servingTeam].score,
    receivingTeamScore: state.teams[receivingTeam].score,
    serverNumber: state.serving.serverNumber,
    servingTeam,
  };
}

/** True when a single point would win the current game for a team. */
export function isGamePoint(state: GameState): { isGamePoint: boolean; team: 'A' | 'B' | null } {
  if (!state?.teams) return { isGamePoint: false, team: null };
  if (isGameWon(state).isWon) return { isGamePoint: false, team: null };

  const scoreA = state.teams.A?.score ?? 0;
  const scoreB = state.teams.B?.score ?? 0;

  // Only the serving team can score, so only they can be at game point.
  const serving = state.serving?.team ?? 'A';
  const servingScore = serving === 'A' ? scoreA : scoreB;
  const receivingScore = serving === 'A' ? scoreB : scoreA;

  const wouldBe = servingScore + 1;
  if (wouldBe >= POINTS_TO_WIN && wouldBe - receivingScore >= WIN_BY) {
    return { isGamePoint: true, team: serving };
  }
  return { isGamePoint: false, team: null };
}

/** True when a single point would win the whole match for a team. */
export function isMatchPoint(state: GameState): { isMatchPoint: boolean; team: 'A' | 'B' | null } {
  const gp = isGamePoint(state);
  if (!gp.isGamePoint || !gp.team) return { isMatchPoint: false, team: null };

  const required = MATCH_MODES[safeMatchMode(state.matchMode)].gamesToWin;
  const wonAfter = (state.gamesWon?.[gp.team] ?? 0) + 1;
  return wonAfter >= required
    ? { isMatchPoint: true, team: gp.team }
    : { isMatchPoint: false, team: null };
}

/** Game is won at 11+ with a 2-point margin. */
export function isGameWon(state: GameState): { isWon: boolean; winner: 'A' | 'B' | null } {
  if (!state?.teams) return { isWon: false, winner: null };
  const scoreA = state.teams.A?.score ?? 0;
  const scoreB = state.teams.B?.score ?? 0;

  if (scoreA >= POINTS_TO_WIN && scoreA - scoreB >= WIN_BY) {
    return { isWon: true, winner: 'A' };
  }
  if (scoreB >= POINTS_TO_WIN && scoreB - scoreA >= WIN_BY) {
    return { isWon: true, winner: 'B' };
  }
  return { isWon: false, winner: null };
}

/**
 * Whether the series is decided. Derived from the games-won tally and the
 * current mode so it stays correct even if the mode is changed mid-match.
 */
export function isMatchWon(state: GameState): { isWon: boolean; winner: 'A' | 'B' | null } {
  if (!state?.gamesWon) return { isWon: false, winner: null };

  const required = MATCH_MODES[safeMatchMode(state.matchMode)].gamesToWin;
  const a = state.gamesWon.A ?? 0;
  const b = state.gamesWon.B ?? 0;

  if (a >= required && a > b) return { isWon: true, winner: 'A' };
  if (b >= required && b > a) return { isWon: true, winner: 'B' };
  return { isWon: false, winner: null };
}

/** Advance to the next game of a series. Undoable like any other action. */
export function startNextGame(state: GameState): GameState {
  const gameWinCheck = isGameWon(state);
  if (!gameWinCheck.isWon || !gameWinCheck.winner) return state;
  if (isMatchWon(state).isWon) return state;

  const newState = beginAction(state);

  // Record the game boundary so the timeline reads as a match, not a blur.
  newState.events = [
    ...newState.events,
    {
      id: generateId(),
      type: 'game',
      team: gameWinCheck.winner,
      server: state.serving.serverNumber,
      score: `${state.teams.A.score}-${state.teams.B.score}`,
      scoreAfter: { A: state.teams.A.score, B: state.teams.B.score },
      serverAfter: { team: state.serving.team, serverNumber: state.serving.serverNumber },
      game: newState.currentGame,
      timestamp: Date.now(),
    },
  ];

  // gamesWon was already credited by scorePoint — just set up the next game.
  newState.currentGame += 1;
  newState.teams.A.score = 0;
  newState.teams.B.score = 0;

  const loser = otherTeam(gameWinCheck.winner);
  newState.serving = { team: loser, serverNumber: 2, isFirstServe: true };

  return newState;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface Momentum {
  teamAPoints: number;
  teamBPoints: number;
  dominant: 'A' | 'B' | 'even';
  streak: { team: 'A' | 'B' | null; count: number };
  /** Winners of the most recent points, oldest → newest. */
  recentPoints: Array<'A' | 'B'>;
}

/** Momentum analysis from the last N points of the current game. */
export function getMomentum(state: GameState, lastN: number = 5): Momentum {
  const currentGame = state.currentGame ?? 1;
  const pointEvents = (state.events ?? []).filter(
    e => e.type === 'point' && (e.game ?? 1) === currentGame,
  );
  const recentEvents = pointEvents.slice(-lastN);

  const teamAPoints = recentEvents.filter(e => e.team === 'A').length;
  const teamBPoints = recentEvents.filter(e => e.team === 'B').length;

  let dominant: 'A' | 'B' | 'even' = 'even';
  if (teamAPoints > teamBPoints) dominant = 'A';
  else if (teamBPoints > teamAPoints) dominant = 'B';

  let streak = { team: null as 'A' | 'B' | null, count: 0 };
  if (pointEvents.length > 0) {
    const lastTeam = pointEvents[pointEvents.length - 1].team;
    let count = 0;
    for (let i = pointEvents.length - 1; i >= 0; i--) {
      if (pointEvents[i].team === lastTeam) count++;
      else break;
    }
    streak = { team: lastTeam, count };
  }

  return {
    teamAPoints,
    teamBPoints,
    dominant,
    streak,
    recentPoints: recentEvents.map(e => e.team),
  };
}

/** Longest run of consecutive points by each team across the whole match. */
export function getLongestRuns(state: GameState): { A: number; B: number } {
  const best = { A: 0, B: 0 };
  let current: 'A' | 'B' | null = null;
  let count = 0;

  for (const event of (state.events ?? [])) {
    if (event.type !== 'point') continue;
    if (event.team === current) {
      count++;
    } else {
      current = event.team;
      count = 1;
    }
    if (count > best[event.team]) best[event.team] = count;
  }
  return best;
}

/**
 * Share of completed service turns a team converted into at least one point.
 * A turn runs from winning the serve until giving it up on a side-out.
 *
 * Only finished turns count: including the one in progress would divide by a
 * turn the team has not had the chance to score in yet, which reads as a
 * sudden drop the moment they win the serve.
 */
export function getServeConversion(state: GameState): { A: number; B: number } {
  const turns = { A: 0, B: 0 };
  const scoring = { A: 0, B: 0 };
  let pointsThisTurn = 0;

  for (const event of (state.events ?? [])) {
    if (event.type === 'point') {
      pointsThisTurn++;
    } else if (event.type === 'sideout') {
      // `event.team` is the team that just lost the serve — the turn's owner.
      turns[event.team]++;
      if (pointsThisTurn > 0) scoring[event.team]++;
      pointsThisTurn = 0;
    } else if (event.type === 'game') {
      // A game ends the serving team's turn without a side-out.
      pointsThisTurn = 0;
    }
  }

  return {
    A: turns.A > 0 ? Math.round((scoring.A / turns.A) * 100) : 0,
    B: turns.B > 0 ? Math.round((scoring.B / turns.B) * 100) : 0,
  };
}

// ─── Win Probability Heuristic ────────────────────────────────────────────────

/**
 * Estimate win probability for Team A (Team B = 100 − A), blending:
 * distance to 11, games won in the series, and recent momentum.
 */
export function getWinProbability(state: GameState): number {
  if (!state?.teams) return 50;

  const scoreA = state.teams.A?.score ?? 0;
  const scoreB = state.teams.B?.score ?? 0;
  const gamesA = state.gamesWon?.A ?? 0;
  const gamesB = state.gamesWon?.B ?? 0;

  const matchResult = isMatchWon(state);
  if (matchResult.isWon) return matchResult.winner === 'A' ? 100 : 0;

  // 1. Distance to 11.
  const distA = Math.max(0, POINTS_TO_WIN - scoreA);
  const distB = Math.max(0, POINTS_TO_WIN - scoreB);
  const totalDist = distA + distB;
  const scoreProbA = totalDist > 0 ? Math.round((distB / totalDist) * 100) : 50;

  // 2. Games won so far (series modes only).
  const mode = safeMatchMode(state.matchMode);
  const requiredWins = MATCH_MODES[mode].gamesToWin;
  let gamesProbA = 50;
  if (requiredWins > 1) {
    const totalGames = gamesA + gamesB;
    if (totalGames > 0) gamesProbA = Math.round((gamesA / totalGames) * 100);
  }

  // 3. Recent momentum.
  const momentum = getMomentum(state);
  const totalMomentum = momentum.teamAPoints + momentum.teamBPoints;
  const momentumProbA = totalMomentum > 0
    ? Math.round((momentum.teamAPoints / totalMomentum) * 100)
    : 50;

  const weightedProb = requiredWins > 1
    ? Math.round(scoreProbA * 0.6 + gamesProbA * 0.25 + momentumProbA * 0.15)
    : Math.round(scoreProbA * 0.75 + momentumProbA * 0.25);

  // Never show a live match as a lock.
  return Math.max(5, Math.min(95, weightedProb));
}
