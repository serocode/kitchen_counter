'use client';

import { useState } from 'react';
import {
  GameState,
  MatchStats,
  Momentum,
  Player,
  Team,
  MATCH_MODES,
  canSwapPartners,
  safeMatchMode,
} from '@/lib/pickleball-state';
import { Chip } from '@/components/ui/chip';

interface PlayersViewProps {
  gameState: GameState;
  gameWon: { isWon: boolean; winner: 'A' | 'B' | null };
  matchWon: { isWon: boolean; winner: 'A' | 'B' | null };
  momentum: Momentum;
  matchStats: { A: MatchStats; B: MatchStats };
  longestRuns: { A: number; B: number };
  servingPlayerIndex: 0 | 1;
  receivingPlayerIndex: 0 | 1;
  onSwapPartners: (team: 'A' | 'B') => void;
  onEditPlayers: () => void;
}

type TeamKey = 'A' | 'B';
type Court = 'left' | 'right';
/** What a player is doing right now; null once the game or match is decided. */
type Role = 'server' | 'second-server' | 'receiver' | 'partner' | null;

interface LineupRow {
  player: Player;
  court: Court;
  role: Role;
  /** The serve number this player holds, when that means something. */
  serverTag: 1 | 2 | null;
}

const TEAM_COLOR = { A: 'var(--kc-team-a)', B: 'var(--kc-team-b)' } as const;
const TEAM_LABEL = { A: 'Team 1', B: 'Team 2' } as const;

/** A translucent version of any colour token, for borders and washes. */
const tint = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`;

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (words[0][0] + last).toUpperCase();
}

/**
 * Both players of a team, the one in play first.
 *
 * Positions swap every time a team scores, so listing by court would have the
 * serving player hop between rows after every point. Putting whoever is
 * serving (or receiving) on top keeps the highlight where the eye already is;
 * the court pill says which side they are on.
 */
function buildLineup(args: {
  team: Team;
  isServing: boolean;
  live: boolean;
  serverNumber: 1 | 2;
  isFirstServe: boolean;
  activeIndex: 0 | 1;
}): LineupRow[] {
  const { team, isServing, live, serverNumber, isFirstServe, activeIndex } = args;

  const rows = ([0, 1] as const).map((index): LineupRow => {
    const isActive = index === activeIndex;
    // index 1 is the right/even court, index 0 the left/odd court.
    const court: Court = index === 1 ? 'right' : 'left';
    const player = team.players[index];

    if (!live) return { player, court, role: null, serverTag: null };

    if (!isServing) {
      return { player, court, role: isActive ? 'receiver' : 'partner', serverTag: null };
    }
    if (isActive) {
      return { player, court, role: 'server', serverTag: serverNumber };
    }
    return {
      player,
      court,
      // The opening serve of a game is the team's only one, so its partner
      // has no turn to wait for.
      role: serverNumber === 1 ? 'second-server' : 'partner',
      serverTag: isFirstServe ? null : serverNumber === 1 ? 2 : 1,
    };
  });

  return live && activeIndex === 1 ? [rows[1], rows[0]] : rows;
}

function Avatar({ player, ring, isServer }: { player: Player; ring: string; isServer: boolean }) {
  // Remember the source that failed rather than a bare flag, so picking a new
  // photo gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = player.photo && player.photo !== failedSrc ? player.photo : null;

  return (
    <div className="relative shrink-0">
      <div
        className="w-14 h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 rounded-full overflow-hidden flex items-center justify-center bg-kc-surface-highest"
        style={{ border: `2px solid ${ring}` }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            onError={() => setFailedSrc(src)}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <span
            className="font-lexend font-bold text-base lg:text-lg xl:text-xl text-kc-text-dim"
            aria-hidden="true"
          >
            {initialsOf(player.name)}
          </span>
        )}
      </div>

      {isServer && (
        <span
          className="absolute -bottom-1 -right-1 w-6 h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center bg-kc-accent text-kc-on-accent border-2 border-kc-surface-high"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined filled text-[14px] lg:text-[16px] leading-none">
            sports_tennis
          </span>
        </span>
      )}
    </div>
  );
}

function RoleBadge({ role, teamColor }: { role: Exclude<Role, null>; teamColor: string }) {
  const base =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-lexend text-[10px] font-bold uppercase tracking-wider whitespace-nowrap';

  switch (role) {
    case 'server':
      return (
        <span className={base} style={{ background: tint('var(--kc-accent)', 16), color: 'var(--kc-accent)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />
          Serving now
        </span>
      );
    case 'receiver':
      return (
        <span className={base} style={{ background: tint(teamColor, 16), color: teamColor }}>
          <span className="material-symbols-outlined text-[12px] leading-none" aria-hidden="true">
            shield
          </span>
          Receiving
        </span>
      );
    case 'second-server':
      return (
        <span className={base} style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text)' }}>
          Second server
        </span>
      );
    case 'partner':
      return (
        <span className={base} style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text-dim)' }}>
          Partner
        </span>
      );
  }
}

function PlayerRow({ row, teamColor }: { row: LineupRow; teamColor: string }) {
  const { player, court, role, serverTag } = row;
  const isServer = role === 'server';
  const isReceiver = role === 'receiver';

  const ring = isServer ? 'var(--kc-accent)' : isReceiver ? teamColor : 'var(--kc-outline)';
  const border = isServer
    ? tint('var(--kc-accent)', 40)
    : isReceiver
      ? tint(teamColor, 40)
      : 'var(--kc-outline-dim)';

  return (
    <li
      className="flex items-center justify-between gap-3 rounded-xl p-3 lg:p-4 border transition-colors"
      style={{
        background: isServer || isReceiver ? 'var(--kc-surface-high)' : tint('var(--kc-surface-high)', 45),
        borderColor: border,
      }}
    >
      <div className="flex items-center gap-3 lg:gap-4 min-w-0">
        <Avatar player={player} ring={ring} isServer={isServer} />

        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {role && <RoleBadge role={role} teamColor={teamColor} />}
            <span
              className="px-2 py-0.5 rounded-full font-inter text-[10px] font-semibold whitespace-nowrap"
              style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-secondary-text)' }}
            >
              {court === 'right' ? 'Right court' : 'Left court'}
            </span>
          </div>
          <h3
            className={`font-lexend text-[15px] lg:text-lg xl:text-xl truncate ${
              isServer || isReceiver ? 'font-semibold text-kc-text' : 'font-medium text-kc-text-dim'
            }`}
          >
            {player.name}
          </h3>
        </div>
      </div>

      {serverTag && (
        <span
          className="shrink-0 px-2 py-1 rounded-lg font-lexend text-[11px] lg:text-xs font-bold bg-kc-surface-highest"
          style={{ color: isServer ? 'var(--kc-accent)' : 'var(--kc-text-dim)' }}
        >
          <span aria-hidden="true">S{serverTag}</span>
          <span className="sr-only">Server {serverTag}</span>
        </span>
      )}
    </li>
  );
}

interface SquadStatus {
  label: string;
  icon?: string;
  tone: 'accent' | 'solid' | 'neutral';
}

function SquadCard({
  teamKey,
  team,
  status,
  rows,
  isLoser,
  onSwap,
}: {
  teamKey: TeamKey;
  team: Team;
  status: SquadStatus | null;
  rows: LineupRow[];
  isLoser: boolean;
  /** Present only while partners may still choose their courts. */
  onSwap: (() => void) | null;
}) {
  const color = TEAM_COLOR[teamKey];
  const headingId = `squad-${teamKey}`;

  const statusStyle = (tone: SquadStatus['tone']) =>
    tone === 'solid'
      ? { background: 'var(--kc-accent)', color: 'var(--kc-on-accent)', border: '1px solid transparent' }
      : tone === 'accent'
        ? {
            background: tint('var(--kc-accent)', 10),
            color: 'var(--kc-accent)',
            border: `1px solid ${tint('var(--kc-accent)', 30)}`,
          }
        : {
            background: 'var(--kc-surface-highest)',
            color: 'var(--kc-text-dim)',
            border: '1px solid var(--kc-outline-dim)',
          };

  return (
    <section
      aria-labelledby={headingId}
      className={`flex flex-col gap-3 lg:gap-4 rounded-2xl lg:rounded-3xl p-4 lg:p-6 border transition-all duration-700 ${
        isLoser ? 'grayscale opacity-80' : ''
      }`}
      style={{ background: tint('var(--kc-surface-mid)', 80), borderColor: 'var(--kc-outline-dim)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-1.5 h-9 rounded-full shrink-0" style={{ background: color }} aria-hidden="true" />
          <div className="flex flex-col min-w-0">
            <span
              className="font-lexend text-[10px] lg:text-[11px] font-bold uppercase tracking-widest"
              style={{ color }}
            >
              {TEAM_LABEL[teamKey]}
            </span>
            <h2
              id={headingId}
              className="font-lexend text-lg lg:text-2xl xl:text-3xl font-bold tracking-tight text-kc-text truncate"
            >
              {team.name}
            </h2>
          </div>
        </div>

        {status && (
          <span
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-lexend text-[10px] lg:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
            style={statusStyle(status.tone)}
          >
            {status.icon && (
              <span className="material-symbols-outlined filled text-[13px] leading-none" aria-hidden="true">
                {status.icon}
              </span>
            )}
            {status.label}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-2 lg:gap-3">
        {rows.map(row => (
          <PlayerRow key={row.court} row={row} teamColor={color} />
        ))}
      </ul>

      {onSwap && (
        <button
          type="button"
          onClick={onSwap}
          aria-label={`Swap court sides for ${team.name}`}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border bg-kc-surface-high/60 hover:bg-kc-surface-highest text-kc-text-dim hover:text-kc-text text-[13px] font-medium transition-all active:scale-[0.98] cursor-pointer"
          style={{ borderColor: 'var(--kc-outline-dim)' }}
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">swap_vert</span>
          <span>Swap court sides</span>
        </button>
      )}
    </section>
  );
}

export function PlayersView({
  gameState,
  gameWon,
  matchWon,
  momentum,
  matchStats,
  longestRuns,
  servingPlayerIndex,
  receivingPlayerIndex,
  onSwapPartners,
  onEditPlayers,
}: PlayersViewProps) {
  const teams = gameState.teams;
  const { serving } = gameState;

  const matchMode = safeMatchMode(gameState.matchMode);
  const isMultiGame = matchMode !== 'casual';
  // Who is serving or receiving only means something while a rally can be played.
  const live = !gameWon.isWon && !matchWon.isWon;
  const swappable = canSwapPartners(gameState);

  const scoreColor = (team: TeamKey) =>
    !matchWon.isWon || matchWon.winner === team ? 'var(--kc-accent)' : 'var(--kc-text-dim)';

  const statusFor = (team: TeamKey): SquadStatus | null => {
    if (matchWon.isWon) {
      return matchWon.winner === team ? { label: 'Winner', icon: 'trophy', tone: 'solid' } : null;
    }
    if (gameWon.isWon) {
      return gameWon.winner === team
        ? { label: `Won game ${gameState.currentGame}`, icon: 'trophy', tone: 'accent' }
        : null;
    }
    return serving.team === team
      ? { label: 'Serving', tone: 'accent' }
      : { label: 'Receiving', tone: 'neutral' };
  };

  const squads = (['A', 'B'] as const).map(key => {
    const isServing = serving.team === key;
    return {
      key,
      team: teams[key],
      status: statusFor(key),
      rows: buildLineup({
        team: teams[key],
        isServing,
        live,
        serverNumber: serving.serverNumber,
        isFirstServe: serving.isFirstServe,
        activeIndex: isServing ? servingPlayerIndex : receivingPlayerIndex,
      }),
      isLoser: matchWon.isWon && matchWon.winner !== key,
    };
  });

  const gameLabel = matchWon.isWon
    ? 'Final'
    : `Game ${gameState.currentGame}${isMultiGame ? ` of ${MATCH_MODES[matchMode].totalGames}` : ''}`;

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-5xl xl:max-w-7xl flex flex-col gap-4 lg:gap-6 px-4 lg:px-8">
        {/* ===== Status strip ===== */}
        <div
          className="flex items-center justify-between gap-x-3 gap-y-2 flex-wrap rounded-xl px-4 py-2.5 border"
          style={{ background: tint('var(--kc-surface)', 70), borderColor: 'var(--kc-outline-dim)' }}
        >
          <span className="inline-flex items-center gap-2 font-lexend text-[11px] font-bold uppercase tracking-widest text-kc-text-dim">
            <span
              className={`w-2 h-2 rounded-full ${live ? 'bg-kc-accent animate-pulse' : 'bg-kc-text-muted'}`}
              aria-hidden="true"
            />
            Doubles · {MATCH_MODES[matchMode].label}
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            {live && serving.isFirstServe && (
              <Chip background="var(--kc-surface-highest)" color="var(--kc-text-dim)">
                ⚡ First serve · one server
              </Chip>
            )}
            <Chip background="var(--kc-surface-highest)" color="var(--kc-text)">
              {gameLabel}
            </Chip>
          </div>
        </div>

        {/* ===== Lineup: stacked below lg, side by side with the score between ===== */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] gap-3 lg:gap-6">
          <SquadCard
            teamKey="A"
            team={squads[0].team}
            status={squads[0].status}
            rows={squads[0].rows}
            isLoser={squads[0].isLoser}
            onSwap={swappable ? () => onSwapPartners('A') : null}
          />

          {/* ----- Versus: the score, in the gap between the squads ----- */}
          <div className="flex lg:flex-col items-center gap-3 lg:gap-4 lg:w-60 xl:w-72">
            <div className="h-px flex-1 lg:h-auto lg:w-px bg-kc-outline/40" aria-hidden="true" />

            <div
              className="flex flex-col items-center gap-3 rounded-2xl px-5 py-3 lg:px-6 lg:py-5 border shadow-lg max-w-full"
              style={{ background: tint('var(--kc-surface-highest)', 85), borderColor: 'var(--kc-outline-dim)' }}
            >
              <span className="font-lexend text-[10px] font-bold uppercase tracking-[0.25em] text-kc-text-dim">
                VS
              </span>

              <div className="flex items-center gap-4 lg:gap-5">
                {(['A', 'B'] as const).map((key, i) => (
                  <div key={key} className="contents">
                    {i === 1 && (
                      <div className="w-px h-8 lg:h-12 rounded-full bg-kc-text-dim opacity-30" aria-hidden="true" />
                    )}
                    <div className="flex flex-col items-center min-w-0">
                      {/* Stacked cards lose the left/right mapping a wide screen gives for free. */}
                      <span className="lg:hidden font-lexend text-[9px] font-bold uppercase tracking-[0.15em] text-kc-text-dim truncate max-w-[84px]">
                        {teams[key].name}
                      </span>
                      <span
                        className="font-lexend text-4xl lg:text-5xl xl:text-6xl font-black leading-none tabular-nums"
                        style={{ color: scoreColor(key) }}
                      >
                        <span className="sr-only">{teams[key].name} </span>
                        {teams[key].score.toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {isMultiGame && (
                <div className="flex items-center gap-2 rounded-lg bg-kc-surface-high/80 px-3 py-1 border border-kc-surface-highest">
                  <span className="font-lexend text-[9px] uppercase tracking-[0.2em] text-kc-text-dim font-bold">
                    Games
                  </span>
                  <span className="font-lexend text-sm font-bold" style={{ color: scoreColor('A') }}>
                    {gameState.gamesWon?.A ?? 0}
                  </span>
                  <span className="font-lexend text-[10px] text-kc-text-dim" aria-hidden="true">–</span>
                  <span className="font-lexend text-sm font-bold" style={{ color: scoreColor('B') }}>
                    {gameState.gamesWon?.B ?? 0}
                  </span>
                </div>
              )}

              {/* The brag line once it's over; the last few points while it isn't. */}
              {matchWon.isWon ? (
                <div className="flex flex-col items-center gap-1">
                  {[
                    { label: 'Points', a: matchStats.A.pointsWon, b: matchStats.B.pointsWon },
                    { label: 'Best run', a: longestRuns.A, b: longestRuns.B },
                  ].map(stat => (
                    <span key={stat.label} className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="font-lexend text-[9px] uppercase tracking-[0.15em] text-kc-text-dim font-bold">
                        {stat.label}
                      </span>
                      <span className="font-lexend text-xs font-bold" style={{ color: scoreColor('A') }}>{stat.a}</span>
                      <span className="font-lexend text-[10px] text-kc-text-dim" aria-hidden="true">–</span>
                      <span className="font-lexend text-xs font-bold" style={{ color: scoreColor('B') }}>{stat.b}</span>
                    </span>
                  ))}
                </div>
              ) : (
                momentum.recentPoints.length > 0 && (
                  <div
                    className="flex gap-1.5 items-center"
                    role="img"
                    aria-label={`Last ${momentum.recentPoints.length} points: ${momentum.recentPoints
                      .map(t => teams[t].name)
                      .join(', ')}`}
                  >
                    {momentum.recentPoints.map((team, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ background: team === 'A' ? 'var(--kc-accent)' : 'var(--kc-text-dim)' }}
                      />
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="h-px flex-1 lg:h-auto lg:w-px bg-kc-outline/40" aria-hidden="true" />
          </div>

          <SquadCard
            teamKey="B"
            team={squads[1].team}
            status={squads[1].status}
            rows={squads[1].rows}
            isLoser={squads[1].isLoser}
            onSwap={swappable ? () => onSwapPartners('B') : null}
          />
        </div>

        {/* ===== Edit ===== */}
        <button
          type="button"
          onClick={onEditPlayers}
          className="w-full lg:w-auto lg:self-center lg:px-12 py-3.5 rounded-full kinetic-gradient flex items-center justify-center gap-2 font-lexend font-bold text-sm uppercase tracking-widest transition-all active:scale-[0.99] hover:opacity-90 shadow-md cursor-pointer"
          style={{ color: 'var(--kc-on-accent)' }}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
          <span>Manage Players</span>
        </button>
      </div>
    </div>
  );
}
