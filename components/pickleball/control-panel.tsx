'use client';

interface ControlPanelProps {
  onScorePoint: () => void;
  onFault: () => void;
  onResetRequest: () => void;
  onRestartMatch: () => void;
  onNextGame: () => void;
  onUndo: () => void;
  canUndo: boolean;
  isGameWon: boolean;
  isMatchWon: boolean;
  /** Name of the team that would receive the point. */
  servingTeamName: string;
  /** 1 → serve passes to the partner; 2 → side-out to the other team. */
  serverNumber: 1 | 2;
}

/** Small keyboard-shortcut chip, hidden where there is no keyboard. */
function Shortcut({ keys }: { keys: string }) {
  return (
    <kbd
      className="hidden md:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold leading-none"
      style={{ background: 'rgba(0,0,0,0.18)', color: 'inherit' }}
    >
      {keys}
    </kbd>
  );
}

export function ControlPanel({
  onScorePoint,
  onFault,
  onResetRequest,
  onRestartMatch,
  onNextGame,
  onUndo,
  canUndo,
  isGameWon,
  isMatchWon,
  servingTeamName,
  serverNumber,
}: ControlPanelProps) {
  const scoringLocked = isGameWon || isMatchWon;
  // Naming what the button will actually do removes the guesswork about
  // whether a fault means "second server" or "side-out".
  const faultLabel = serverNumber === 1 ? 'SECOND SERVER' : 'SIDE OUT';

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4" aria-label="Scoring controls">
      {/* ===== POINT BUTTON — Primary CTA ===== */}
      <button
        onClick={onScorePoint}
        disabled={scoringLocked}
        aria-label={`Award a point to ${servingTeamName}`}
        className={`col-span-2 h-20 md:h-24 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 ${
          scoringLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{
          background: 'linear-gradient(135deg, #f4ffc8 0%, #cffc00 100%)',
          color: 'var(--kc-on-accent)',
          boxShadow: scoringLocked ? 'none' : '0 0 20px rgba(209, 255, 0, 0.15)',
        }}
      >
        <span className="flex items-center gap-3">
          <span className="material-symbols-outlined font-black text-3xl" aria-hidden="true">add_circle</span>
          <span className="font-lexend font-extrabold text-2xl uppercase tracking-widest">POINT</span>
          <Shortcut keys="Space" />
        </span>
        <span className="font-inter font-bold text-[10px] uppercase tracking-widest opacity-70 truncate max-w-full px-4">
          to {servingTeamName}
        </span>
      </button>

      {/* ===== FAULT / SIDE OUT BUTTON ===== */}
      <button
        onClick={onFault}
        disabled={scoringLocked}
        aria-label={`Record a fault — serve goes to ${faultLabel.toLowerCase()}`}
        className={`h-20 md:h-24 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-1 px-2 transition-all duration-200 active:scale-95 ${
          scoringLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text)' }}
      >
        <span className="material-symbols-outlined" style={{ color: 'var(--kc-accent)' }} aria-hidden="true">
          swap_horiz
        </span>
        <span className="font-inter font-bold text-[10px] uppercase tracking-widest text-center leading-tight">
          {faultLabel}
        </span>
        <Shortcut keys="F" />
      </button>

      {/* ===== UNDO BUTTON ===== */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo the last action"
        className={`h-20 md:h-24 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-1 px-2 transition-all duration-200 active:scale-95 ${
          !canUndo ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text)' }}
      >
        <span className="material-symbols-outlined" style={{ color: 'var(--kc-error)' }} aria-hidden="true">
          undo
        </span>
        <span className="font-inter font-bold text-[10px] uppercase tracking-widest text-center leading-tight">
          UNDO
        </span>
        <Shortcut keys="Z" />
      </button>

      {/* ===== NEXT GAME ===== */}
      {isGameWon && !isMatchWon && (
        <button
          onClick={onNextGame}
          className="col-span-2 md:col-span-4 h-14 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-95 cursor-pointer animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, #f4ffc8 0%, #cffc00 100%)',
            color: 'var(--kc-on-accent)',
            boxShadow: '0 0 20px rgba(209, 255, 0, 0.15)',
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          <span className="font-lexend font-bold text-sm uppercase tracking-widest">START NEXT GAME</span>
        </button>
      )}

      {/* ===== MATCH OVER ===== */}
      {isMatchWon && (
        <>
          <button
            onClick={onRestartMatch}
            className="col-span-2 h-14 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center gap-2 md:gap-3 transition-all duration-200 active:scale-95 cursor-pointer animate-fade-in"
            style={{
              background: 'linear-gradient(135deg, #f4ffc8 0%, #cffc00 100%)',
              color: 'var(--kc-on-accent)',
              boxShadow: '0 0 20px rgba(209, 255, 0, 0.15)',
            }}
          >
            <span className="material-symbols-outlined text-lg md:text-2xl" aria-hidden="true">replay</span>
            <span className="font-lexend font-bold text-xs md:text-sm uppercase tracking-widest text-center">
              REMATCH
            </span>
          </button>

          <button
            onClick={onResetRequest}
            className="col-span-2 h-14 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center gap-2 md:gap-3 transition-all duration-200 active:scale-95 cursor-pointer animate-fade-in"
            style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text)' }}
          >
            <span className="material-symbols-outlined text-lg md:text-2xl" style={{ color: 'var(--kc-error)' }} aria-hidden="true">
              power_settings_new
            </span>
            <span className="font-lexend font-bold text-xs md:text-sm uppercase tracking-widest text-center">
              NEW MATCH
            </span>
          </button>
        </>
      )}
    </section>
  );
}
