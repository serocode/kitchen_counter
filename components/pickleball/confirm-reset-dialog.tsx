import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface ConfirmResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onConfirmKeepSettings: () => void;
}

export function ConfirmResetDialog({ open, onOpenChange, onConfirm, onConfirmKeepSettings }: ConfirmResetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        style={{
          background: 'var(--kc-surface-mid)',
          border: '1px solid var(--kc-outline)',
          borderRadius: '32px',
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="font-lexend font-bold text-xl uppercase tracking-widest"
            style={{ color: 'var(--kc-error)' }}
          >
            Reset Match?
          </DialogTitle>
          <DialogDescription
            className="text-sm mt-2 font-inter"
            style={{ color: 'var(--kc-text-dim)' }}
          >
            Scores, history and stats for this match will be permanently lost.
            Choose whether to keep your teams and format.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-8 gap-3 sm:justify-start flex-col sm:flex-col">
          {/* Restart with same settings */}
          <button
            onClick={() => {
              onConfirmKeepSettings();
              onOpenChange(false);
            }}
            className="w-full px-6 py-4 rounded-2xl text-left transition-all active:scale-95 cursor-pointer"
            style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-accent)' }}
          >
            <span className="block font-lexend font-bold text-sm uppercase tracking-widest">
              Restart with same teams
            </span>
            <span className="block mt-1 font-inter text-xs" style={{ color: 'var(--kc-text-dim)' }}>
              Keeps names, photos and match format
            </span>
          </button>

          {/* Full reset */}
          <button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="w-full px-6 py-4 rounded-2xl text-left transition-all active:scale-95 cursor-pointer"
            style={{ background: 'var(--kc-error)', color: 'var(--kc-bg)' }}
          >
            <span className="block font-lexend font-bold text-sm uppercase tracking-widest">
              Full reset
            </span>
            <span className="block mt-1 font-inter text-xs opacity-80">
              Clears teams, players, photos and format too
            </span>
          </button>

          {/* Cancel */}
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
