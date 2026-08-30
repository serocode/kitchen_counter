'use client';

import { GameState, Player, safeMatchMode } from '@/lib/pickleball-state';

interface ScoreDisplayProps {
  gameState: GameState | null;
  servingTeam: 'A' | 'B';
  servingPlayerIndex: 0 | 1;
  lastAction: 'point' | 'fault' | null;
  gamePoint: { isGamePoint: boolean; team: 'A' | 'B' | null };
  matchPoint: { isMatchPoint: boolean; team: 'A' | 'B' | null };
}

function padScore(score: number): string {
  return score.toString().padStart(2, '0');
}

/** One team's card: name, players, serve state and the score itself. */
function TeamScoreCard({
  team,
  isServing,
  serverNumber,
  servingPlayerIndex,
  didJustScore,
  isGamePoint,
  isMatchPoint,
}: {
  team: { name: string; score: number; players: [Player, Player] };
  isServing: boolean;
  serverNumber: 1 | 2;
  servingPlayerIndex: 0 | 1;
  didJustScore: boolean;
  isGamePoint: boolean;
  isMatchPoint: boolean;
}) {
  return (
    <div
      className="rounded-2xl md:rounded-[32px] p-3 md:p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300"
      style={{
        background: 'var(--kc-surface)',
        // A ring, not a dimmed score, marks the serving team — the score has
        // to stay readable from across a court either way.
        outline: isServing ? '2px solid var(--kc-accent)' : '1px solid var(--kc-outline-dim)',
        outlineOffset: '-1px',
        boxShadow: isServing
          ? '0 0 28px var(--kc-accent-glow), 0 0 64px var(--kc-accent-glow), inset 0 0 48px rgba(209, 255, 0, 0.05)'
          : 'none',
      }}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1.5 md:gap-3 mb-1 md:mb-2">
        <div className="space-y-0.5 md:space-y-1 min-w-0">
          <span
            className="font-lexend text-[9px] md:text-[10px] uppercase tracking-widest font-semibold block truncate"
            style={{ color: isServing ? 'var(--kc-accent)' : 'var(--kc-text-dim)' }}
          >
            {team.name}
          </span>
          <h2
            className="font-lexend font-bold text-[13px] md:text-2xl leading-tight break-words"
            style={{ color: 'var(--kc-text)' }}
          >
            {team.players.map((player, index) => (
              <span key={index}>
                {index > 0 && (
                  <>
                    <br />
                    <span style={{ color: 'var(--kc-text-dim)' }}>&amp;</span>{' '}
                  </>
                )}
                <span
                  style={
                    isServing && index === servingPlayerIndex
                      ? { color: 'var(--kc-accent)' }
                      : undefined
                  }
                >
                  {player.name.toUpperCase()}
                </span>
              </span>
            ))}
          </h2>
        </div>

        {isServing && (
          <div className="flex flex-row md:flex-col items-center md:items-end gap-1.5 md:gap-2 shrink-0">
            <div
              className="px-2 md:px-4 py-0.5 md:py-1 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-widest animate-pulse-glow"
              style={{ background: 'var(--kc-accent)', color: 'var(--kc-on-accent)' }}
            >
              SERVING
            </div>
            <div className="flex gap-1" role="img" aria-label={`Server ${serverNumber} of 2`}>
              {([1, 2] as const).map(n => (
                <div
                  key={n}
                  className="w-4 md:w-8 h-1.5 md:h-2 rounded-full transition-colors duration-300"
                  style={{
                    background: serverNumber === n ? 'var(--kc-accent)' : 'var(--kc-surface-highest)',
                  }}
                />
              ))}
            </div>
            <span
              className="text-[9px] md:text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap"
              style={{ color: 'var(--kc-text-dim)' }}
            >
              <span className="md:hidden">S{serverNumber}</span>
              <span className="hidden md:inline">SERVER {serverNumber}</span>
            </span>
          </div>
        )}
      </div>

      {/* Score — THE focal point */}
      <div className="flex flex-col items-center justify-center py-1 md:py-6">
        <span
          className={`font-lexend font-black text-[4rem] sm:text-[5.5rem] md:text-[12rem] lg:text-[14rem] leading-none tracking-tighter transition-colors duration-300 ${
            didJustScore ? 'animate-score-pop' : ''
          }`}
          style={{
            color: isServing ? 'var(--kc-accent)' : 'var(--kc-text)',
            textShadow: isServing ? '0 0 40px var(--kc-accent-glow-strong)' : 'none',
          }}
        >
          {padScore(team.score)}
        </span>

        {(isMatchPoint || isGamePoint) && (
          <span
            className="mt-1.5 md:mt-2 px-2 md:px-4 py-0.5 md:py-1 rounded-full text-[8px] md:text-[10px] font-lexend font-black uppercase tracking-widest text-center animate-pulse-glow"
            style={{
              background: isMatchPoint ? 'var(--kc-accent)' : 'var(--kc-accent-container)',
              color: 'var(--kc-on-accent)',
            }}
          >
            {isMatchPoint ? 'MATCH POINT' : 'GAME POINT'}
          </span>
        )}
      </div>
    </div>
  );
}

/** Games-won banner for best-of-3 / best-of-5 matches. */
function SeriesScore({ gameState }: { gameState: GameState }) {
  const gamesA = gameState.gamesWon?.A ?? 0;
  const gamesB = gameState.gamesWon?.B ?? 0;
  const leader = gamesA === gamesB ? null : gamesA > gamesB ? 'A' : 'B';

  const sideColor = (team: 'A' | 'B') =>
    leader === team ? 'var(--kc-accent)' : 'var(--kc-text)';

  return (
    <div
      className="rounded-2xl md:rounded-[32px] p-3 md:p-6 flex items-center justify-center gap-3 md:gap-12"
      style={{ background: 'var(--kc-surface)', border: '1px solid var(--kc-outline-dim)' }}
    >
      <div className="flex-1 flex flex-col items-end gap-1 min-w-0">
        <span
          className="font-lexend font-bold text-xs md:text-xl text-right truncate w-full"
          style={{ color: sideColor('A') }}
        >
          {gameState.teams.A.name}
        </span>
        {leader === 'A' && (
          <span
            className="px-2 py-0.5 rounded text-[9px] font-lexend font-bold uppercase tracking-widest animate-fade-in"
            style={{ background: 'var(--kc-accent-container)', color: 'var(--kc-on-accent)' }}
          >
            LEADING
          </span>
        )}
      </div>

      <div className="flex flex-col items-center min-w-[84px] md:min-w-[120px] shrink-0">
        <span
          className="text-[9px] md:text-[10px] font-lexend font-bold uppercase tracking-widest mb-0.5 md:mb-1 whitespace-nowrap"
          style={{ color: 'var(--kc-text-dim)' }}
        >
          Games Won
        </span>
        <div className="flex items-center gap-2.5 md:gap-4">
          <span className="font-lexend font-black text-2xl md:text-4xl leading-none" style={{ color: sideColor('A') }}>
            {gamesA}
          </span>
          <span className="font-lexend font-bold text-base md:text-xl" style={{ color: 'var(--kc-text-muted)' }}>—</span>
          <span className="font-lexend font-black text-2xl md:text-4xl leading-none" style={{ color: sideColor('B') }}>
            {gamesB}
          </span>
        </div>
        {leader === null && (
          <span
            className="mt-2 text-[9px] font-lexend font-bold uppercase tracking-widest"
            style={{ color: 'var(--kc-text-dim)' }}
          >
            TIED
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
        <span
          className="font-lexend font-bold text-xs md:text-xl text-left truncate w-full"
          style={{ color: sideColor('B') }}
        >
          {gameState.teams.B.name}
        </span>
        {leader === 'B' && (
          <span
            className="px-2 py-0.5 rounded text-[9px] font-lexend font-bold uppercase tracking-widest animate-fade-in"
            style={{ background: 'var(--kc-accent-container)', color: 'var(--kc-on-accent)' }}
          >
            LEADING
          </span>
        )}
      </div>
    </div>
  );
}

export function ScoreDisplay({
  gameState,
  servingTeam,
  servingPlayerIndex,
  lastAction,
  gamePoint,
  matchPoint,
}: ScoreDisplayProps) {
  if (!gameState) {
    return <div className="h-64 rounded-[32px] animate-pulse" style={{ background: 'var(--kc-surface)' }} />;
  }

  const matchMode = safeMatchMode(gameState.matchMode);

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {matchMode !== 'casual' && <SeriesScore gameState={gameState} />}

      <section
        className="grid grid-cols-2 gap-2.5 md:gap-4 lg:gap-6 items-stretch"
        aria-label="Current game score"
      >
        {(['A', 'B'] as const).map(key => (
          <TeamScoreCard
            key={key}
            team={gameState.teams[key]}
            isServing={servingTeam === key}
            serverNumber={gameState.serving.serverNumber}
            servingPlayerIndex={servingPlayerIndex}
            didJustScore={lastAction === 'point' && servingTeam === key}
            isGamePoint={gamePoint.isGamePoint && gamePoint.team === key}
            isMatchPoint={matchPoint.isMatchPoint && matchPoint.team === key}
          />
        ))}
      </section>
    </div>
  );
}
