'use client';

import { GameState, MatchStats, Momentum, MATCH_MODES, safeMatchMode } from '@/lib/pickleball-state';

interface StatsViewProps {
  gameState: GameState;
  scoreCall: {
    servingTeamScore: number;
    receivingTeamScore: number;
    serverNumber: 1 | 2;
    servingTeam: 'A' | 'B';
  } | null;
  momentum: Momentum;
  gamePoint: { isGamePoint: boolean; team: 'A' | 'B' | null };
  matchPoint: { isMatchPoint: boolean; team: 'A' | 'B' | null };
  winProbability: number;
  matchStats: { A: MatchStats; B: MatchStats };
  longestRuns: { A: number; B: number };
  serveConversion: { A: number; B: number };
}

function StatRow({
  valueA,
  label,
  valueB,
  hint,
  lowerIsBetter = false,
}: {
  valueA: number | string;
  label: string;
  valueB: number | string;
  hint?: string;
  lowerIsBetter?: boolean;
}) {
  const numericA = typeof valueA === 'number' ? valueA : Number.NaN;
  const numericB = typeof valueB === 'number' ? valueB : Number.NaN;
  const comparable = !Number.isNaN(numericA) && !Number.isNaN(numericB);

  const aLeads = comparable && (lowerIsBetter ? numericA < numericB : numericA > numericB);
  const bLeads = comparable && (lowerIsBetter ? numericB < numericA : numericB > numericA);

  return (
    <>
      <div
        className="text-xl font-lexend font-bold"
        style={{ color: aLeads ? 'var(--kc-accent)' : 'var(--kc-text)' }}
      >
        {valueA}
      </div>
      <div className="flex flex-col items-center justify-center">
        <span className="text-xs font-medium" style={{ color: 'var(--kc-text-dim)' }}>
          {label}
        </span>
        {hint && (
          <span className="text-[9px] mt-0.5 text-center" style={{ color: 'var(--kc-text-muted)' }}>
            {hint}
          </span>
        )}
      </div>
      <div
        className="text-xl font-lexend font-bold"
        style={{ color: bLeads ? 'var(--kc-accent)' : 'var(--kc-text)' }}
      >
        {valueB}
      </div>
    </>
  );
}

export function StatsView({
  gameState,
  scoreCall,
  momentum,
  gamePoint,
  matchPoint,
  winProbability,
  matchStats,
  longestRuns,
  serveConversion,
}: StatsViewProps) {
  const teamA = gameState.teams.A;
  const teamB = gameState.teams.B;
  const matchMode = safeMatchMode(gameState.matchMode);
  const isMultiGame = matchMode !== 'casual';

  const winProbA = winProbability;
  const winProbB = 100 - winProbA;

  const totalEvents = gameState.events.length;
  const last5Points = gameState.events
    .filter(e => e.type === 'point' && (e.game ?? 1) === gameState.currentGame)
    .slice(-5);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span
            className="text-[10px] font-lexend uppercase tracking-[0.2em]"
            style={{ color: 'var(--kc-text-dim)' }}
          >
            Live Match Analytics
          </span>
          <h2 className="text-xl font-lexend font-bold">Match Stats</h2>
        </div>
        {scoreCall && (
          <div
            className="px-4 py-2 rounded-full font-lexend font-bold text-lg shrink-0"
            style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text)' }}
            title="Serving score – receiving score – server number"
          >
            {scoreCall.servingTeamScore}-{scoreCall.receivingTeamScore}-{scoreCall.serverNumber}
          </div>
        )}
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ===== Win Probability ===== */}
        <div className="rounded-[32px] p-6 flex flex-col justify-between" style={{ background: 'var(--kc-surface)' }}>
          <div>
            <p
              className="text-[10px] font-lexend uppercase tracking-widest mb-1"
              style={{ color: 'var(--kc-text-dim)' }}
            >
              Win Probability
            </p>
            <div className="flex justify-between items-baseline gap-2">
              <div className="min-w-0">
                <h4
                  className="text-4xl font-lexend font-bold"
                  style={{ color: winProbA >= winProbB ? 'var(--kc-accent)' : 'var(--kc-text)' }}
                >
                  {winProbA}
                  <span className="text-lg font-normal" style={{ color: 'var(--kc-text-dim)' }}>%</span>
                </h4>
                <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--kc-text-muted)' }}>
                  {teamA.name}
                </p>
              </div>
              <div className="text-right min-w-0">
                <h4
                  className="text-4xl font-lexend font-bold"
                  style={{ color: winProbB > winProbA ? 'var(--kc-accent)' : 'var(--kc-text)' }}
                >
                  {winProbB}
                  <span className="text-lg font-normal" style={{ color: 'var(--kc-text-dim)' }}>%</span>
                </h4>
                <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--kc-text-muted)' }}>
                  {teamB.name}
                </p>
              </div>
            </div>
          </div>
          <div
            className="mt-6 flex items-center h-3 rounded-full overflow-hidden"
            style={{ background: 'var(--kc-surface-highest)' }}
            role="img"
            aria-label={`${teamA.name} ${winProbA} percent, ${teamB.name} ${winProbB} percent`}
          >
            <div className="h-full transition-all duration-500" style={{ width: `${winProbA}%`, background: 'var(--kc-accent)' }} />
            <div className="h-full transition-all duration-500" style={{ width: `${winProbB}%`, background: 'var(--kc-surface-bright)' }} />
          </div>
          <p className="mt-3 text-[9px] leading-snug" style={{ color: 'var(--kc-text-muted)' }}>
            Estimate from score, games won and recent momentum — not a prediction.
          </p>
        </div>

        {/* ===== Momentum ===== */}
        <div className="md:col-span-2 rounded-[32px] p-6" style={{ background: 'var(--kc-surface)' }}>
          <div className="flex justify-between items-center gap-3 mb-6">
            <div className="min-w-0">
              <p
                className="text-[10px] font-lexend uppercase tracking-widest mb-1"
                style={{ color: 'var(--kc-text-dim)' }}
              >
                Momentum
              </p>
              <h4 className="text-xl font-lexend font-bold truncate">
                {momentum.dominant === 'even'
                  ? 'Even Match'
                  : `${momentum.dominant === 'A' ? teamA.name : teamB.name} Dominant`}
              </h4>
            </div>
            {momentum.streak.team && momentum.streak.count >= 2 && (
              <span
                className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shrink-0"
                style={{ background: 'var(--kc-accent)', color: 'var(--kc-on-accent)' }}
              >
                🔥 {momentum.streak.count} streak
              </span>
            )}
          </div>

          {/* Last 5 points — one bar per point, coloured by the team that won it */}
          <div className="flex items-end gap-2 h-20">
            {last5Points.length === 0 ? (
              <p className="text-xs font-inter self-center" style={{ color: 'var(--kc-text-muted)' }}>
                No points scored yet this game
              </p>
            ) : (
              last5Points.map((event, i) => {
                // Height tracks the winning team's score at that moment, so
                // the shape reads as the game building rather than as noise.
                const maxScore = Math.max(event.scoreAfter.A, event.scoreAfter.B, 1);
                const heightPct = 40 + (event.scoreAfter[event.team] / maxScore) * 40;
                const teamName = event.team === 'A' ? teamA.name : teamB.name;
                return (
                  <div
                    key={event.id || i}
                    title={`${teamName} — ${event.score}`}
                    className="flex-1 rounded-lg transition-all duration-300 animate-slide-in-up"
                    style={{
                      height: `${heightPct}px`,
                      background: event.team === 'A' ? 'var(--kc-accent)' : 'var(--kc-surface-bright)',
                      animationDelay: `${i * 0.05}s`,
                      minWidth: '12px',
                      maxWidth: '32px',
                    }}
                  />
                );
              })
            )}
            {Array.from({ length: Math.max(0, 5 - last5Points.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex-1 rounded-lg"
                style={{ height: '24px', background: 'var(--kc-surface-highest)', minWidth: '12px', maxWidth: '32px' }}
              />
            ))}
          </div>

          <div className="flex justify-between items-center gap-3 mt-3">
            <span className="text-[10px] font-inter shrink-0" style={{ color: 'var(--kc-text-muted)' }}>
              Last 5 Points
            </span>
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--kc-accent)' }} />
                <span className="text-[10px] truncate" style={{ color: 'var(--kc-text-muted)' }}>{teamA.name}</span>
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--kc-surface-bright)' }} />
                <span className="text-[10px] truncate" style={{ color: 'var(--kc-text-muted)' }}>{teamB.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Match Metrics Table ===== */}
      <div className="rounded-[32px] overflow-hidden" style={{ background: 'var(--kc-surface)' }}>
        <div
          className="px-6 py-4 flex justify-between items-center gap-3"
          style={{ borderBottom: '1px solid var(--kc-outline-dim)' }}
        >
          <h3 className="font-lexend font-bold text-sm tracking-widest uppercase">Match Metrics</h3>
          <span className="text-[10px] shrink-0" style={{ color: 'var(--kc-text-dim)' }}>
            {totalEvents} total events
          </span>
        </div>

        <div className="p-6 grid grid-cols-3 gap-y-6 text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] truncate" style={{ color: 'var(--kc-text-dim)' }}>
            {teamA.name}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--kc-text-dim)' }}>
            Metric
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] truncate" style={{ color: 'var(--kc-text-dim)' }}>
            {teamB.name}
          </div>

          <StatRow valueA={teamA.score} label="Score" valueB={teamB.score} hint="this game" />

          {isMultiGame && (
            <StatRow
              valueA={gameState.gamesWon?.A ?? 0}
              label="Games Won"
              valueB={gameState.gamesWon?.B ?? 0}
              hint={`first to ${MATCH_MODES[matchMode].gamesToWin}`}
            />
          )}

          <StatRow valueA={matchStats.A.pointsWon} label="Points Won" valueB={matchStats.B.pointsWon} hint="whole match" />
          <StatRow valueA={longestRuns.A} label="Longest Run" valueB={longestRuns.B} hint="points in a row" />
          <StatRow
            valueA={`${serveConversion.A}%`}
            label="Serve Conversion"
            valueB={`${serveConversion.B}%`}
            hint="turns that scored"
          />
          <StatRow
            valueA={matchStats.A.faults}
            label="Serve Faults"
            valueB={matchStats.B.faults}
            hint="first server lost"
            lowerIsBetter
          />
          <StatRow
            valueA={matchStats.A.sideOuts}
            label="Side-outs"
            valueB={matchStats.B.sideOuts}
            hint="serve handed over"
            lowerIsBetter
          />
        </div>
      </div>

      {/* ===== Game / Match Point Indicator ===== */}
      {gamePoint.isGamePoint && (
        <div className="rounded-[32px] p-6 text-center animate-pulse-glow" style={{ background: 'var(--kc-surface)' }}>
          <span className="material-symbols-outlined text-4xl mb-2" style={{ color: 'var(--kc-accent)' }} aria-hidden="true">
            emoji_events
          </span>
          <h3 className="font-lexend font-black text-2xl uppercase tracking-widest" style={{ color: 'var(--kc-accent)' }}>
            {matchPoint.isMatchPoint ? 'MATCH POINT' : 'GAME POINT'}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--kc-text-dim)' }}>
            {gamePoint.team === 'A' ? teamA.name : teamB.name} is one point away from{' '}
            {matchPoint.isMatchPoint ? 'the match' : 'the game'}
          </p>
        </div>
      )}
    </div>
  );
}
