'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Court } from '@/lib/open-play';
import { PlayerChip, TEAM_COLORS, dialogContentStyle, inputStyle } from './shared';

interface RecordScoreDialogProps {
  /** The court being scored; null closes the dialog. */
  court: Court | null;
  resolve: (id: string) => PlayerChip;
  onOpenChange: (open: boolean) => void;
  onSave: (winner: 0 | 1, score: [number, number]) => void;
}

const MAX_POINTS = 99;

export function RecordScoreDialog({ court, resolve, onOpenChange, onSave }: RecordScoreDialogProps) {
  const [scores, setScores] = useState<[string, string]>(['', '']);

  // The dialog stays mounted between courts, so start each one blank. Done
  // while rendering, not in an effect, so a stale score never paints.
  const courtId = court?.id ?? null;
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (courtId !== seededFor) {
    setSeededFor(courtId);
    if (courtId) setScores(['', '']);
  }

  const match = court?.match;
  const parsed = scores.map(v => (v === '' ? null : Number(v))) as [number | null, number | null];
  const complete = parsed[0] !== null && parsed[1] !== null;
  const tied = complete && parsed[0] === parsed[1];
  const winner: 0 | 1 | null = complete && !tied ? (parsed[0]! > parsed[1]! ? 0 : 1) : null;

  const setScore = (side: 0 | 1, value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 2);
    const clamped = digits === '' ? '' : String(Math.min(MAX_POINTS, Number(digits)));
    setScores(prev => (side === 0 ? [clamped, prev[1]] : [prev[0], clamped]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (winner === null || parsed[0] === null || parsed[1] === null) return;
    onSave(winner, [parsed[0], parsed[1]]);
    onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(court)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" style={dialogContentStyle}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-lexend font-bold text-xl uppercase tracking-widest" style={{ color: 'var(--kc-text)' }}>
              {court?.name ?? 'Court'} score
            </DialogTitle>
            <DialogDescription className="text-sm" style={{ color: 'var(--kc-text-dim)' }}>
              Enter the final points. The higher score wins.
            </DialogDescription>
          </DialogHeader>

          {match && (
            <div className="grid grid-cols-2 gap-3 mt-6">
              {match.teams.map((team, index) => {
                const side = index as 0 | 1;
                const isWinner = winner === side;
                return (
                  <div
                    key={side}
                    className="rounded-2xl p-3 space-y-3 transition-colors"
                    style={{
                      background: 'var(--kc-surface-high)',
                      outline: isWinner ? '2px solid var(--kc-accent)' : 'none',
                      outlineOffset: '-2px',
                    }}
                  >
                    <label htmlFor={`score-${side}`} className="block">
                      <span
                        className="block font-lexend text-[9px] uppercase tracking-widest font-bold mb-1"
                        style={{ color: TEAM_COLORS[side] }}
                      >
                        Team {side + 1}
                      </span>
                      <span className="block text-sm font-semibold truncate" style={{ color: 'var(--kc-text)' }}>
                        {team.map(id => resolve(id).name).join(' & ')}
                      </span>
                    </label>
                    <input
                      id={`score-${side}`}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={scores[side]}
                      onChange={e => setScore(side, e.target.value)}
                      placeholder="0"
                      autoFocus={side === 0}
                      style={{
                        ...inputStyle,
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 900,
                        fontSize: '32px',
                        textAlign: 'center',
                        padding: '8px',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-3 min-h-5 text-xs font-inter" role="status" style={{ color: tied ? 'var(--kc-error)' : 'var(--kc-text-dim)' }}>
            {tied ? 'A game can’t end tied.' : winner !== null ? `Team ${winner + 1} wins.` : ''}
          </p>

          <DialogFooter className="mt-4 gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-6 py-3 rounded-full font-inter font-semibold text-sm transition-all active:scale-95 cursor-pointer"
              style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text-dim)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={winner === null}
              className="px-6 py-3 rounded-full font-lexend font-bold text-sm uppercase tracking-widest kinetic-gradient transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: 'var(--kc-on-accent)' }}
            >
              Save result
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
