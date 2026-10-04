import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { OpenPlaySession, Standing } from '@/lib/open-play';
import { formatDuration, type SessionHighlights } from '@/lib/open-play-stats';
import type { PhotoMap } from '@/hooks/useOpenPlay';
import { Podium } from './podium';
import { ShareResults } from './share-results';
import { dialogContentStyle } from './shared';

interface EndSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: OpenPlaySession;
  standings: Standing[];
  highlights: SessionHighlights;
  photos: PhotoMap;
  playerName: (id: string) => string;
  onKeepRoster: () => void;
  onClearAll: () => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl px-3 py-2.5 text-center" style={{ background: 'var(--kc-surface-high)' }}>
      <div className="font-lexend font-black text-lg tabular-nums" style={{ color: 'var(--kc-text)' }}>
        {value}
      </div>
      <div className="font-lexend text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--kc-text-muted)' }}>
        {label}
      </div>
    </div>
  );
}

/**
 * The end of a session: how it went first, a way to keep the results, and only
 * then the choice of how to start over. Both ways are undoable afterwards, so
 * the dialog says so instead of warning that nothing can be taken back.
 */
export function EndSessionDialog({
  open,
  onOpenChange,
  session,
  standings,
  highlights,
  photos,
  playerName,
  onKeepRoster,
  onClearAll,
}: EndSessionDialogProps) {
  const hasResults = session.results.length > 0;
  const live = session.courts.filter(court => court.match).length;

  const choose = (action: () => void) => () => {
    action();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" style={dialogContentStyle}>
        <DialogHeader>
          <DialogTitle className="font-lexend font-bold text-xl uppercase tracking-widest" style={{ color: 'var(--kc-text)' }}>
            Wrap up session
          </DialogTitle>
          <DialogDescription className="text-sm mt-2 font-inter" style={{ color: 'var(--kc-text-dim)' }}>
            {hasResults
              ? 'Here is how the session went. Save the results before you start over.'
              : 'No games were recorded, so there is nothing to save.'}
          </DialogDescription>
        </DialogHeader>

        {hasResults && (
          <div className="mt-6 space-y-5">
            <div className="flex gap-2">
              <Stat label="Games" value={String(highlights.games)} />
              <Stat label="Players" value={String(highlights.players)} />
              <Stat label="Time" value={formatDuration(highlights.durationMinutes)} />
            </div>

            {standings.length >= 3 && (
              <div className="rounded-3xl px-3 pt-5" style={{ background: 'var(--kc-surface)' }}>
                <Podium standings={standings} photos={photos} compact />
              </div>
            )}

            <ShareResults report={{ standings, results: session.results, highlights, playerName }} />
          </div>
        )}

        {live > 0 && (
          <p
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-2xl px-4 py-3 text-xs font-inter"
            style={{ background: 'var(--kc-surface-high)', color: 'var(--kc-text-dim)' }}
          >
            <span className="material-symbols-outlined text-[18px] shrink-0" style={{ color: 'var(--kc-error)' }} aria-hidden="true">
              warning
            </span>
            <span>
              {live === 1 ? '1 match is' : `${live} matches are`} still on court. Starting over drops{' '}
              {live === 1 ? 'it' : 'them'} without a result — record {live === 1 ? 'it' : 'them'} first to keep{' '}
              {live === 1 ? 'it' : 'them'} in the standings.
            </span>
          </p>
        )}

        <div className="mt-6">
          <span className="block font-lexend text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--kc-text-muted)' }}>
            Then start fresh
          </span>
        </div>

        <DialogFooter className="mt-3 gap-3 sm:justify-start flex-col sm:flex-col">
          <button
            type="button"
            onClick={choose(onKeepRoster)}
            className="w-full px-6 py-4 rounded-2xl text-left transition-all active:scale-95 cursor-pointer"
            style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-accent)' }}
          >
            <span className="block font-lexend font-bold text-sm uppercase tracking-widest">
              New session, same players
            </span>
            <span className="block mt-1 font-inter text-xs" style={{ color: 'var(--kc-text-dim)' }}>
              Keeps everyone, their ratings, locked partners and place in line. Games, standings and courts are cleared.
            </span>
          </button>

          <button
            type="button"
            onClick={choose(onClearAll)}
            className="w-full px-6 py-4 rounded-2xl text-left transition-all active:scale-95 cursor-pointer"
            style={{ background: 'transparent', color: 'var(--kc-error)', border: '1px solid var(--kc-error)' }}
          >
            <span className="block font-lexend font-bold text-sm uppercase tracking-widest">Clear everything</span>
            <span className="block mt-1 font-inter text-xs" style={{ color: 'var(--kc-text-dim)' }}>
              Removes every player from the roster too.
            </span>
          </button>

          <p className="text-xs font-inter text-center" style={{ color: 'var(--kc-text-muted)' }}>
            Changed your mind? <strong style={{ color: 'var(--kc-text-dim)' }}>Undo</strong> at the top brings it all
            back.
          </p>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full px-6 py-3 rounded-full font-inter font-semibold text-sm transition-all active:scale-95 cursor-pointer"
            style={{ background: 'transparent', color: 'var(--kc-text-dim)', border: '1px solid var(--kc-outline-dim)' }}
          >
            Cancel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
