'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MATCHING_MODES, MAX_COURTS, MatchingMode, OpenPlaySession } from '@/lib/open-play';
import { dialogContentStyle } from './shared';

interface SessionSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: OpenPlaySession;
  onCourtCount: (count: number) => void;
  onMode: (mode: MatchingMode) => void;
  onAutoStart: (autoStart: boolean) => void;
}

/** Venue settings. Each control applies immediately — there is nothing to save. */
export function SessionSetupDialog({
  open,
  onOpenChange,
  session,
  onCourtCount,
  onMode,
  onAutoStart,
}: SessionSetupDialogProps) {
  const courtCount = session.courts.length;
  const lastCourtBusy = Boolean(session.courts[courtCount - 1]?.match);

  const stepperButton =
    'w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={dialogContentStyle}>
        <DialogHeader>
          <DialogTitle className="font-lexend font-bold text-xl uppercase tracking-widest" style={{ color: 'var(--kc-text)' }}>
            Session setup
          </DialogTitle>
          <DialogDescription className="text-sm" style={{ color: 'var(--kc-text-dim)' }}>
            How many courts you have, and how players are matched onto them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 mt-4">
          {/* Courts */}
          <div className="space-y-3">
            <span
              id="court-count-label"
              className="block font-lexend text-[10px] uppercase tracking-widest font-bold"
              style={{ color: 'var(--kc-text-dim)' }}
            >
              Courts
            </span>
            <div className="flex items-center gap-4" role="group" aria-labelledby="court-count-label">
              <button
                type="button"
                onClick={() => onCourtCount(courtCount - 1)}
                disabled={courtCount <= 1 || lastCourtBusy}
                aria-label="Remove a court"
                className={stepperButton}
                style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text)' }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">remove</span>
              </button>
              <span
                className="font-lexend font-black text-4xl tabular-nums w-12 text-center"
                style={{ color: 'var(--kc-accent)' }}
                aria-live="polite"
              >
                {courtCount}
              </span>
              <button
                type="button"
                onClick={() => onCourtCount(courtCount + 1)}
                disabled={courtCount >= MAX_COURTS}
                aria-label="Add a court"
                className={stepperButton}
                style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text)' }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">add</span>
              </button>
            </div>
            {lastCourtBusy && courtCount > 1 && (
              <p className="text-xs font-inter" style={{ color: 'var(--kc-text-muted)' }}>
                {session.courts[courtCount - 1].name} has a game on — finish it before removing the court.
              </p>
            )}
          </div>

          {/* Matching */}
          <div className="space-y-3">
            <span
              className="block font-lexend text-[10px] uppercase tracking-widest font-bold"
              style={{ color: 'var(--kc-text-dim)' }}
            >
              Matching
            </span>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(MATCHING_MODES) as MatchingMode[]).map(mode => {
                const isSelected = session.mode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onMode(mode)}
                    className={`p-4 rounded-xl text-left transition-all border-2 cursor-pointer ${
                      isSelected
                        ? 'border-kc-accent bg-kc-surface-high'
                        : 'border-transparent bg-kc-surface-high opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className={`font-lexend font-bold text-sm ${isSelected ? 'text-kc-accent' : 'text-kc-text'}`}>
                      {MATCHING_MODES[mode].label}
                    </div>
                    <div className="font-inter text-xs mt-1 text-kc-text-dim">{MATCHING_MODES[mode].description}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs font-inter" style={{ color: 'var(--kc-text-muted)' }}>
              Every mode keeps the line fair: whoever has waited longest plays first, and repeat
              partners and opponents are avoided.
            </p>
          </div>

          {/* Auto-start */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <span
                id="auto-start-label"
                className="block font-lexend text-[10px] uppercase tracking-widest font-bold"
                style={{ color: 'var(--kc-text-dim)' }}
              >
                Auto-start next match
              </span>
              <p id="auto-start-hint" className="text-xs font-inter mt-1" style={{ color: 'var(--kc-text-muted)' }}>
                Put the up-next match on a court the moment its result is recorded.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={session.autoStart}
              aria-labelledby="auto-start-label"
              aria-describedby="auto-start-hint"
              onClick={() => onAutoStart(!session.autoStart)}
              className="relative w-12 h-7 shrink-0 rounded-full transition-colors cursor-pointer"
              style={{ background: session.autoStart ? 'var(--kc-accent)' : 'var(--kc-surface-highest)' }}
            >
              <span
                className="absolute top-1 w-5 h-5 rounded-full transition-all"
                style={{
                  left: session.autoStart ? '24px' : '4px',
                  background: session.autoStart ? 'var(--kc-on-accent)' : 'var(--kc-text-dim)',
                }}
              />
            </button>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-6 py-3 rounded-full font-lexend font-bold text-sm uppercase tracking-widest kinetic-gradient transition-all active:scale-95 cursor-pointer"
            style={{ color: 'var(--kc-on-accent)' }}
          >
            Done
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
