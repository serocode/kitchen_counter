import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dialogContentStyle } from './shared';

interface EndSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeepRoster: () => void;
  onClearAll: () => void;
}

export function EndSessionDialog({ open, onOpenChange, onKeepRoster, onClearAll }: EndSessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" style={dialogContentStyle}>
        <DialogHeader>
          <DialogTitle className="font-lexend font-bold text-xl uppercase tracking-widest" style={{ color: 'var(--kc-error)' }}>
            End session?
          </DialogTitle>
          <DialogDescription className="text-sm mt-2 font-inter" style={{ color: 'var(--kc-text-dim)' }}>
            Games, standings and the courts are cleared. This can&apos;t be undone. Court count and
            matching settings stay as they are.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-8 gap-3 sm:justify-start flex-col sm:flex-col">
          <button
            onClick={() => {
              onKeepRoster();
              onOpenChange(false);
            }}
            className="w-full px-6 py-4 rounded-2xl text-left transition-all active:scale-95 cursor-pointer"
            style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-accent)' }}
          >
            <span className="block font-lexend font-bold text-sm uppercase tracking-widest">
              New session, same players
            </span>
            <span className="block mt-1 font-inter text-xs" style={{ color: 'var(--kc-text-dim)' }}>
              Keeps everyone and their ratings, in their current place in line
            </span>
          </button>

          <button
            onClick={() => {
              onClearAll();
              onOpenChange(false);
            }}
            className="w-full px-6 py-4 rounded-2xl text-left transition-all active:scale-95 cursor-pointer"
            style={{ background: 'var(--kc-error)', color: 'var(--kc-bg)' }}
          >
            <span className="block font-lexend font-bold text-sm uppercase tracking-widest">Clear everything</span>
            <span className="block mt-1 font-inter text-xs opacity-80">Removes every player from the roster too</span>
          </button>

          <button
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
