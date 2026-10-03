'use client';

import type { Court } from '@/lib/open-play';
import type { CourtScore } from '@/hooks/useCourtScoreboard';
import { IconButton, PlayerChip, TEAM_COLORS, TeamBlock, TextAction } from './shared';

function formatElapsed(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  return minutes < 1 ? 'Just started' : `${minutes} min`;
}

interface CourtCardProps {
  court: Court;
  resolve: (id: string) => PlayerChip;
  now: number;
  /** A match is staged and ready to go on this court. */
  canStart: boolean;
  /** This court's game on the full scoreboard, if one is being kept. */
  scoreboard: CourtScore | undefined;
  onStart: () => void;
  onWin: (winner: 0 | 1) => void;
  /** Record the decided scoreboard game as this court's result. */
  onRecordScoreboard: () => void;
  onEnterScore: () => void;
  onKeepScore: () => void;
  onCancel: () => void;
}

export function CourtCard({
  court,
  resolve,
  now,
  canStart,
  scoreboard,
  onStart,
  onWin,
  onRecordScoreboard,
  onEnterScore,
  onKeepScore,
  onCancel,
}: CourtCardProps) {
  const { match } = court;

  if (!match) {
    return (
      <article
        aria-label={`${court.name}, open`}
        className="rounded-[28px] p-5 flex flex-col items-center justify-center gap-3 min-h-[220px] text-center animate-fade-in"
        style={{ border: '2px dashed var(--kc-outline)' }}
      >
        <h3 className="font-lexend font-black text-sm uppercase tracking-widest" style={{ color: 'var(--kc-text)' }}>
          {court.name}
        </h3>
        <span
          className="font-lexend text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--kc-text-muted)' }}
        >
          Open
        </span>
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          className="mt-1 px-5 py-3 rounded-full font-lexend font-bold text-xs uppercase tracking-widest kinetic-gradient transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          style={{ color: 'var(--kc-on-accent)' }}
        >
          Start up next
        </button>
        {!canStart && (
          <p className="text-xs font-inter" style={{ color: 'var(--kc-text-muted)' }}>
            Needs 4 players waiting
          </p>
        )}
      </article>
    );
  }

  const teams = match.teams.map(pair => pair.map(resolve));

  return (
    <article
      aria-label={court.name}
      className="rounded-[28px] p-4 md:p-5 flex flex-col gap-3 animate-fade-in"
      style={{ background: 'var(--kc-surface)', outline: '1px solid var(--kc-outline-dim)', outlineOffset: '-1px' }}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="font-lexend font-black text-sm uppercase tracking-widest" style={{ color: 'var(--kc-text)' }}>
          {court.name}
        </h3>
        <div className="flex items-center gap-1 -mr-2">
          {scoreboard ? (
            <span
              className="px-3 py-1 rounded-full text-[10px] font-lexend font-bold uppercase tracking-widest tabular-nums"
              style={{ background: 'var(--kc-accent)', color: 'var(--kc-on-accent)' }}
            >
              {scoreboard.winner === null ? 'Live' : 'Final'} · {scoreboard.score[0]}–{scoreboard.score[1]}
            </span>
          ) : (
            <span
              className="flex items-center gap-1.5 text-[10px] font-lexend font-bold uppercase tracking-widest"
              style={{ color: 'var(--kc-text-dim)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--kc-accent)' }} />
              {formatElapsed(now - match.startedAt)}
            </span>
          )}
          <IconButton
            icon="u_turn_left"
            label={`Send ${court.name} back to the queue without a result`}
            title="Back to the queue — no result"
            onClick={onCancel}
          />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <TeamBlock side={0} players={teams[0]} />
        <TeamBlock side={1} players={teams[1]} />
      </div>

      {scoreboard && scoreboard.winner !== null && (
        <button
          type="button"
          onClick={onRecordScoreboard}
          className="h-12 rounded-2xl flex items-center justify-center gap-2 font-lexend font-bold text-xs uppercase tracking-widest kinetic-gradient transition-all active:scale-95 cursor-pointer"
          style={{ color: 'var(--kc-on-accent)' }}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
          Record Team {scoreboard.winner + 1} win
          {scoreboard.pointsAreFinal && ` ${scoreboard.score[0]}–${scoreboard.score[1]}`}
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        {([0, 1] as const).map(side => (
          <button
            key={side}
            type="button"
            onClick={() => onWin(side)}
            aria-label={`Team ${side + 1} won on ${court.name}: ${teams[side].map(p => p.name).join(' and ')}`}
            className="h-12 rounded-2xl flex items-center justify-center gap-1.5 font-lexend font-bold text-[11px] uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
            style={{ background: 'var(--kc-surface-highest)', color: TEAM_COLORS[side] }}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">emoji_events</span>
            Team {side + 1} won
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-2">
        <TextAction icon="edit_note" onClick={onEnterScore}>
          Enter score
        </TextAction>
        <TextAction icon="scoreboard" onClick={onKeepScore}>
          {scoreboard ? 'Open scoreboard' : 'Keep score'}
        </TextAction>
      </div>
    </article>
  );
}
