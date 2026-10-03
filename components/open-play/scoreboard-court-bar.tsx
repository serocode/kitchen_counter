'use client';

import type { Court } from '@/lib/open-play';
import type { CourtScore } from '@/hooks/useCourtScoreboard';

interface ScoreboardCourtBarProps {
  courts: Court[];
  followedCourt: Court | null;
  /** The followed court's current match is the one on the scoreboard. */
  isShowingCourtMatch: boolean;
  courtScores: Map<string, CourtScore>;
  onSelect: (courtId: string | null) => void;
  onRecord: (courtId: string) => void;
  onBack: () => void;
}

/**
 * Sits on top of the scoreboard while open play is running: pick which court
 * the scoreboard follows, see every court's live score, and send a finished
 * game back to its court.
 */
export function ScoreboardCourtBar({
  courts,
  followedCourt,
  isShowingCourtMatch,
  courtScores,
  onSelect,
  onRecord,
  onBack,
}: ScoreboardCourtBarProps) {
  const current = followedCourt?.match && isShowingCourtMatch ? courtScores.get(followedCourt.match.id) : undefined;

  const chip = (selected: boolean) =>
    `shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full font-lexend text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
      selected ? '' : 'hover:bg-[var(--kc-surface-highest)]'
    }`;
  const chipStyle = (selected: boolean): React.CSSProperties => ({
    background: selected ? 'var(--kc-accent)' : 'var(--kc-surface-high)',
    color: selected ? 'var(--kc-on-accent)' : 'var(--kc-text-dim)',
  });

  return (
    <div className="mb-4 space-y-3 animate-fade-in">
      <nav aria-label="Scoreboard follows" className="flex items-center gap-2">
        {/* The fade says "more this way" when the chips run past the edge. */}
        <div
          className="flex-1 min-w-0 flex gap-2 overflow-x-auto no-scrollbar py-0.5 pr-6"
          style={{
            maskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)',
          }}
        >
          {courts.map(court => {
            const selected = followedCourt?.id === court.id;
            const score = court.match ? courtScores.get(court.match.id) : undefined;
            return (
              <button
                key={court.id}
                type="button"
                onClick={() => onSelect(court.id)}
                aria-pressed={selected}
                className={chip(selected)}
                style={chipStyle(selected)}
              >
                {court.match && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: selected ? 'var(--kc-on-accent)' : 'var(--kc-accent)' }}
                    aria-hidden="true"
                  />
                )}
                {court.name}
                {score ? (
                  <span className="tabular-nums">
                    {score.score[0]}–{score.score[1]}
                  </span>
                ) : (
                  !court.match && <span className="normal-case tracking-normal font-inter font-medium">open</span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-pressed={!followedCourt}
            className={chip(!followedCourt)}
            style={chipStyle(!followedCourt)}
          >
            Free play
          </button>
        </div>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to the courts"
          title="Back to the courts"
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer"
          style={{ background: 'var(--kc-surface-high)', color: 'var(--kc-text)' }}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">sports_tennis</span>
        </button>
      </nav>

      {followedCourt && current && current.winner !== null && (
        <div
          className="rounded-3xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in"
          style={{ background: 'var(--kc-accent-container)', color: 'var(--kc-on-accent)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="font-lexend text-[10px] font-bold uppercase tracking-widest opacity-80">
              Open play · {followedCourt.name}
            </p>
            <p className="font-lexend font-bold text-base">
              Team {current.winner + 1} won
              {current.pointsAreFinal ? `, ${current.score[0]}–${current.score[1]}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRecord(followedCourt.id)}
            className="px-5 py-3 rounded-full font-lexend font-bold text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
            style={{ background: 'var(--kc-bg)', color: 'var(--kc-accent)' }}
          >
            Record on {followedCourt.name}
          </button>
        </div>
      )}

      {followedCourt && !isShowingCourtMatch && (
        <p
          role="status"
          className="rounded-2xl px-4 py-3 text-sm font-inter"
          style={{ background: 'var(--kc-surface-high)', color: 'var(--kc-text-dim)' }}
        >
          {followedCourt.name} is open. Its next match comes up here as soon as it starts.
        </p>
      )}
    </div>
  );
}
