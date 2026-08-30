'use client';

import { GameState, MatchStats, Momentum, Team, safeMatchMode, MATCH_MODES } from '@/lib/pickleball-state';

interface PlayersViewProps {
  gameState: GameState;
  matchWon: { isWon: boolean; winner: 'A' | 'B' | null };
  momentum: Momentum;
  matchStats: { A: MatchStats; B: MatchStats };
  longestRuns: { A: number; B: number };
  onEditPlayers: () => void;
}

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300">
  <g fill="white">
    <circle cx="100" cy="90" r="28" />
    <path d="
      M60 140
      Q100 110 140 140
      L160 260
      L40 260
      Z
    " />
  </g>
  <ellipse cx="100" cy="270" rx="50" ry="10" fill="black" opacity="0.2"/>
</svg>
`);

/**
 * Heights are a share of the panel rather than viewport units: on a phone the
 * panel is roughly a third of the screen, so `vh` sizing overflowed badly.
 */
function PlayerCutout({ src, alt, size }: { src: string; alt: string; size: 'lg' | 'sm' }) {
  return (
    <img
      src={src}
      alt={alt}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR; }}
      className={`object-contain object-bottom drop-shadow-[0_20px_50px_rgba(209,255,0,0.15)] ${
        size === 'lg' ? 'h-[86%] md:h-[58vh]' : 'h-[74%] md:h-[53vh] opacity-85'
      }`}
    />
  );
}

function TeamPanel({
  team,
  isWinner,
  isLoser,
  isServing,
  serverNumber,
  matchDecided,
  side,
}: {
  team: Team;
  isWinner: boolean;
  isLoser: boolean;
  isServing: boolean;
  serverNumber: 1 | 2;
  matchDecided: boolean;
  side: 'A' | 'B';
}) {
  // Team A's big cutout sits outward on each side so the pair reads as a
  // mirrored composition on a wide screen.
  const cutouts =
    side === 'A'
      ? ([['lg', 0], ['sm', 1]] as const)
      : ([['sm', 0], ['lg', 1]] as const);

  return (
    <section
      aria-label={`${team.name} players`}
      className={`relative flex-1 min-h-0 bg-kc-surface overflow-hidden transition-all duration-700 ${
        side === 'A' ? 'border-b md:border-b-0 md:border-r border-kc-accent/10' : ''
      } ${isLoser ? 'grayscale' : ''}`}
    >
      {isWinner && (
        <div
          className="absolute inset-0 z-0 animate-pulse pointer-events-none"
          style={{ boxShadow: 'inset 0 0 120px rgba(209,255,0,0.14)' }}
        />
      )}

      {/* Cutouts sit to the right on a phone so the name has clear space. */}
      <div className="absolute inset-0 z-0 flex items-end justify-end md:justify-center px-2 md:px-4">
        <div className="flex items-end h-full -space-x-6 md:-space-x-12 pb-2 md:pb-0 md:mb-32">
          {cutouts.map(([size, index]) => (
            <PlayerCutout
              key={index}
              src={team.players[index].photo || DEFAULT_AVATAR}
              alt={team.players[index].name}
              size={size}
            />
          ))}
        </div>
      </div>

      {/* Legibility scrims: bottom everywhere, plus left-to-right on a phone. */}
      <div className="absolute inset-0 z-10 bg-linear-to-t from-kc-bg via-kc-bg/40 to-transparent" />
      <div className="absolute inset-0 z-10 bg-linear-to-r from-kc-bg/90 via-kc-bg/30 to-transparent md:hidden" />
      <div
        className={`absolute inset-0 z-10 hidden md:block ${
          side === 'A' ? 'bg-linear-to-r from-transparent to-kc-bg/30' : 'bg-linear-to-l from-transparent to-kc-bg/30'
        }`}
      />

      <div
        className={`relative z-20 h-full flex flex-col justify-end p-4 md:p-8 lg:p-12 pb-4 md:pb-28 lg:pb-36 ${
          side === 'B' ? 'md:items-end md:text-right' : ''
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5 md:mb-2">
          <span
            className="font-lexend font-black italic uppercase tracking-tighter text-[10px] md:text-sm px-3 md:px-4 py-0.5 md:py-1 rounded-full truncate max-w-[60vw]"
            style={{
              background: isWinner ? 'var(--kc-accent)' : 'var(--kc-surface-highest)',
              color: isWinner ? 'var(--kc-on-accent)' : 'var(--kc-text-dim)',
            }}
          >
            {isWinner ? '🏆 ' : ''}{team.name}
          </span>
          {isServing && !matchDecided && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full font-lexend text-[9px] font-bold uppercase tracking-widest shrink-0 md:hidden"
              style={{ background: 'var(--kc-accent)', color: 'var(--kc-on-accent)' }}
            >
              <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
              Serving · S{serverNumber}
            </span>
          )}
        </div>

        <h2
          className="font-lexend text-[26px] leading-[0.9] md:text-4xl lg:text-6xl xl:text-7xl md:leading-[0.85] font-black italic uppercase tracking-tighter wrap-break-words"
          style={{ color: isLoser ? 'var(--kc-text-dim)' : 'var(--kc-accent)' }}
        >
          {team.players[0].name.toUpperCase()} &<br />
          {team.players[1].name.toUpperCase()}
        </h2>
      </div>
    </section>
  );
}

export function PlayersView({
  gameState,
  matchWon,
  momentum,
  matchStats,
  longestRuns,
  onEditPlayers,
}: PlayersViewProps) {
  const teamA = gameState.teams.A;
  const teamB = gameState.teams.B;

  const winner = matchWon.isWon ? matchWon.winner : null;
  const servingTeam = matchWon.isWon ? null : gameState.serving.team;
  const matchMode = safeMatchMode(gameState.matchMode);
  const isMultiGame = matchMode !== 'casual';

  const scoreColor = (team: 'A' | 'B') =>
    !matchWon.isWon || winner === team ? 'var(--kc-accent)' : 'var(--kc-text-dim)';

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row overflow-hidden">
      <TeamPanel
        team={teamA}
        side="A"
        isWinner={winner === 'A'}
        isLoser={winner === 'B'}
        isServing={servingTeam === 'A'}
        serverNumber={gameState.serving.serverNumber}
        matchDecided={matchWon.isWon}
      />

      {/* In flow between the panels on a phone; floated over the net on desktop. */}
      <div
        className="relative z-30 shrink-0 w-full flex flex-col items-center gap-2 px-4 py-3
                   bg-kc-surface-highest/85 backdrop-blur-md border-y border-kc-accent/10
                   md:absolute md:inset-y-0 md:left-1/2 md:-translate-x-1/2 md:z-40 md:w-auto
                   md:justify-center md:gap-3 md:p-0 md:bg-transparent md:backdrop-blur-none
                   md:border-0 md:pointer-events-none"
      >
        <div className="flex items-center gap-2 md:flex-col md:gap-3">
          <span className="font-lexend font-bold text-[9px] md:text-xs uppercase tracking-widest text-kc-text-dim whitespace-nowrap md:bg-kc-surface-highest/80 md:backdrop-blur-md md:px-6 md:py-2 md:rounded-lg md:border md:border-white/5">
            {MATCH_MODES[matchMode].label}
            {matchWon.isWon ? ' · Final' : ` · Game ${gameState.currentGame}`}
          </span>

          {/* Lives in the divider band rather than floating over a panel, so it
              never covers a player's face or name. */}
          <button
            onClick={onEditPlayers}
            className="pointer-events-auto shrink-0 flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-kc-surface-high/90 hover:bg-kc-surface-highest border border-white/5 shadow-lg transition-all hover:scale-105 active:scale-95 group"
          >
            <span className="material-symbols-outlined text-[13px] md:text-[15px] text-kc-text-dim group-hover:text-kc-accent transition-colors" aria-hidden="true">
              edit
            </span>
            <span className="font-lexend text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-kc-text-dim group-hover:text-kc-text transition-colors whitespace-nowrap">
              <span className="md:hidden">Manage</span>
              <span className="hidden md:inline">Manage Players</span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-4 md:gap-8 px-4 md:px-10 py-1.5 md:py-6 -skew-x-[4deg] bg-kc-surface-highest/90 border-l-4 border-kc-accent backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          {/* Stacked panels break the left/right mapping the desktop split
              gives for free, so name each number on a phone. */}
          {([teamA, teamB] as const).map((t, i) => (
            <div key={i} className="contents">
              {i === 1 && <div className="skew-x-[4deg] w-0.5 h-6 md:h-12 rounded-full bg-kc-text-dim opacity-30" />}
              <span className="skew-x-[4deg] flex flex-col items-center min-w-0">
                <span className="md:hidden font-lexend text-[8px] font-bold uppercase tracking-[0.15em] text-kc-text-dim truncate max-w-[72px]">
                  {t.name}
                </span>
                <span
                  className="font-lexend text-4xl md:text-7xl font-black italic leading-none"
                  style={{ color: scoreColor(i === 0 ? 'A' : 'B') }}
                >
                  {t.score.toString().padStart(2, '0')}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* One compact chip row on a phone; a stack on desktop. */}
        <div className="flex flex-row md:flex-col items-center justify-center flex-wrap gap-2 md:gap-3">
          {isMultiGame && (
            <div className="flex items-center gap-2 md:flex-col md:gap-1 rounded-lg bg-kc-surface-high/80 px-3 py-1 md:px-4 md:py-2 border border-kc-surface-highest">
              <span className="font-lexend text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-kc-text-dim font-bold whitespace-nowrap">
                Games
              </span>
              <div className="flex gap-2 md:gap-4 items-center">
                <span className="font-lexend text-sm md:text-xl font-bold" style={{ color: scoreColor('A') }}>
                  {gameState.gamesWon?.A ?? 0}
                </span>
                <span className="font-lexend text-[10px] md:text-xs text-kc-text-dim">–</span>
                <span className="font-lexend text-sm md:text-xl font-bold" style={{ color: scoreColor('B') }}>
                  {gameState.gamesWon?.B ?? 0}
                </span>
              </div>
            </div>
          )}

          {servingTeam && (
            <div className="hidden md:block bg-kc-surface-highest/70 backdrop-blur-sm px-4 py-1.5 rounded-full border border-kc-accent/20 max-w-[45vw]">
              <span className="font-lexend text-[10px] uppercase tracking-widest text-kc-accent font-bold truncate block">
                ● {(servingTeam === 'A' ? teamA.name : teamB.name)} serving · S{gameState.serving.serverNumber}
              </span>
            </div>
          )}

          {/* The brag line: what the match actually looked like. */}
          {matchWon.isWon ? (
            <div className="flex items-center gap-2 md:gap-3 rounded-lg bg-kc-surface-high/80 px-3 py-1 md:px-4 md:py-2 border border-kc-surface-highest">
              {[
                { label: 'Points', a: matchStats.A.pointsWon, b: matchStats.B.pointsWon },
                { label: 'Best run', a: longestRuns.A, b: longestRuns.B },
              ].map(stat => (
                <span key={stat.label} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="font-lexend text-[8px] md:text-[9px] uppercase tracking-[0.15em] text-kc-text-dim font-bold">
                    {stat.label}
                  </span>
                  <span className="font-lexend text-xs md:text-sm font-bold" style={{ color: scoreColor('A') }}>{stat.a}</span>
                  <span className="font-lexend text-[10px] text-kc-text-dim">–</span>
                  <span className="font-lexend text-xs md:text-sm font-bold" style={{ color: scoreColor('B') }}>{stat.b}</span>
                </span>
              ))}
            </div>
          ) : (
            momentum.recentPoints.length > 0 && (
              <div
                className="flex gap-1.5 items-center"
                role="img"
                aria-label={`Last ${momentum.recentPoints.length} points: ${momentum.recentPoints
                  .map(t => (t === 'A' ? teamA.name : teamB.name))
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
      </div>

      <TeamPanel
        team={teamB}
        side="B"
        isWinner={winner === 'B'}
        isLoser={winner === 'A'}
        isServing={servingTeam === 'B'}
        serverNumber={gameState.serving.serverNumber}
        matchDecided={matchWon.isWon}
      />

    </div>
  );
}
