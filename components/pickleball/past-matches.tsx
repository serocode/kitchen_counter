'use client';

import { useState } from 'react';
import { MATCH_MODES } from '@/lib/pickleball-state';
import {
  ArchivedMatch,
  formatDuration,
  resultLine,
  totalPoints,
} from '@/lib/match-archive';

interface PastMatchesProps {
  matches: ArchivedMatch[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

/** Cards rendered before the "show all" affordance kicks in. */
const VISIBLE_MATCH_LIMIT = 10;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** A small labelled figure in the card's footer strip. */
function Meta({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1" style={{ color: 'var(--kc-text-dim)' }}>
      <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
        {icon}
      </span>
      {children}
    </span>
  );
}

function MatchCard({
  match,
  onDelete,
}: {
  match: ArchivedMatch;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const loser = match.winner === 'A' ? 'B' : 'A';
  const winnerTeam = match.teams[match.winner];
  const loserTeam = match.teams[loser];
  const mode = MATCH_MODES[match.matchMode];

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--kc-surface-mid)',
        borderLeft: '4px solid var(--kc-accent)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="font-lexend font-bold text-sm uppercase tracking-widest wrap-break-words"
            style={{ color: 'var(--kc-accent)' }}
          >
            {winnerTeam.name}
          </p>
          <p className="text-[11px] mt-0.5 wrap-break-words" style={{ color: 'var(--kc-text-dim)' }}>
            beat {loserTeam.name}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p
            className="text-2xl font-lexend font-black tracking-tighter leading-none"
            style={{ color: 'var(--kc-text)' }}
          >
            {resultLine(match)}
          </p>
          <p className="text-[9px] uppercase tracking-widest mt-1" style={{ color: 'var(--kc-text-dim)' }}>
            {match.matchMode === 'casual' ? 'Points' : 'Games'}
          </p>
        </div>
      </div>

      {/* Per-game scores — only meaningful in a best-of format. */}
      {match.games.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {match.games.map(game => (
            <span
              key={game.game}
              className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider"
              style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text-dim)' }}
            >
              G{game.game} {game.A}–{game.B}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[10px]">
        <Meta icon="event">
          {formatDate(match.endedAt)}, {formatClock(match.endedAt)}
        </Meta>
        <Meta icon="timer">{formatDuration(match.endedAt - match.startedAt)}</Meta>
        <Meta icon="sports_tennis">{totalPoints(match)} pts</Meta>
        <Meta icon="scoreboard">{mode.label}</Meta>

        <span className="grow" />

        {confirming ? (
          <span className="flex items-center gap-2">
            <button
              onClick={() => onDelete(match.id)}
              className="font-lexend font-bold uppercase tracking-widest cursor-pointer"
              style={{ color: 'var(--kc-error)' }}
            >
              Delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="font-lexend font-bold uppercase tracking-widest cursor-pointer"
              style={{ color: 'var(--kc-text-dim)' }}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            aria-label={`Delete the match ${winnerTeam.name} won on ${formatDate(match.endedAt)}`}
            className="flex items-center transition-colors cursor-pointer hover:text-[var(--kc-error)]"
            style={{ color: 'var(--kc-text-muted)' }}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              delete
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export function PastMatches({ matches, onDelete, onClearAll }: PastMatchesProps) {
  const [showAll, setShowAll] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const visible = showAll ? matches : matches.slice(0, VISIBLE_MATCH_LIMIT);
  const hiddenCount = matches.length - visible.length;

  if (matches.length === 0) {
    return (
      <div className="rounded-[32px] p-12 text-center" style={{ background: 'var(--kc-surface)' }}>
        <span
          className="material-symbols-outlined text-5xl mb-3"
          style={{ color: 'var(--kc-surface-bright)' }}
          aria-hidden="true"
        >
          trophy
        </span>
        <h4 className="font-lexend font-bold text-lg mb-1" style={{ color: 'var(--kc-text-dim)' }}>
          No Finished Matches
        </h4>
        <p className="text-sm" style={{ color: 'var(--kc-text-muted)' }}>
          Play a match to the end and it will be saved here, on this device
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map(match => (
        <MatchCard key={match.id} match={match} onDelete={onDelete} />
      ))}

      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 rounded-2xl font-lexend text-[10px] font-bold uppercase tracking-widest transition-all active:scale-[0.99] cursor-pointer"
          style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text-dim)' }}
        >
          Show {hiddenCount} older {hiddenCount === 1 ? 'match' : 'matches'}
        </button>
      )}

      {confirmingClear ? (
        <div
          className="rounded-2xl p-4 flex flex-wrap items-center gap-3"
          style={{ background: 'var(--kc-surface-high)' }}
        >
          <p className="text-sm grow" style={{ color: 'var(--kc-text)' }}>
            Delete all {matches.length} saved {matches.length === 1 ? 'match' : 'matches'}?
          </p>
          <button
            onClick={() => {
              onClearAll();
              setConfirmingClear(false);
            }}
            className="px-4 py-2 rounded-full font-lexend text-[10px] font-bold uppercase tracking-widest cursor-pointer"
            style={{ background: 'var(--kc-error)', color: 'var(--kc-on-accent)' }}
          >
            Delete all
          </button>
          <button
            onClick={() => setConfirmingClear(false)}
            className="px-4 py-2 rounded-full font-lexend text-[10px] font-bold uppercase tracking-widest cursor-pointer"
            style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text-dim)' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingClear(true)}
          className="w-full py-3 rounded-2xl font-lexend text-[10px] font-bold uppercase tracking-widest transition-all active:scale-[0.99] cursor-pointer"
          style={{ background: 'transparent', color: 'var(--kc-text-muted)' }}
        >
          Clear saved matches
        </button>
      )}
    </div>
  );
}
