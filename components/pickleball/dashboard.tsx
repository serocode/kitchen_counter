'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePickleballGame } from '@/hooks/usePickleballGame';
import { useWakeLock } from '@/hooks/useWakeLock';
import { MATCH_MODES, safeMatchMode } from '@/lib/pickleball-state';
import { ScoreDisplay } from './score-display';
import { CourtDiagram } from './court-diagram';
import { ControlPanel } from './control-panel';
import { PlayersView } from './players-view';
import { PlayerSetupModal } from './player-setup';
import { StatsView } from './stats-view';
import { HistoryView } from './history-view';
import { ConfirmResetDialog } from './confirm-reset-dialog';

type ViewTab = 'scoring' | 'stats' | 'players' | 'history';

const NAV_ITEMS: { id: ViewTab; icon: string; label: string }[] = [
  { id: 'scoring', icon: 'scoreboard', label: 'Scoring' },
  { id: 'stats', icon: 'leaderboard', label: 'Stats' },
  { id: 'players', icon: 'group', label: 'Players' },
  { id: 'history', icon: 'history_edu', label: 'History' },
];

/** A pill in the status strip above the scoreboard. */
function Chip({
  children,
  background,
  color,
  className = '',
}: {
  children: React.ReactNode;
  background: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-lexend font-bold uppercase tracking-widest ${className}`}
      style={{ background, color }}
    >
      {children}
    </span>
  );
}

export function PickleballDashboard() {
  const {
    gameState,
    isLoading,
    lastAction,
    storageError,
    canUndo,
    scorePoint,
    recordFault,
    resetGame,
    resetGameKeepSettings,
    startNextGame,
    undo,
    updateMatchSettings,
    serverPosition,
    servingPlayerIndex,
    receivingPlayerIndex,
    scoreCall,
    gamePoint,
    matchPoint,
    gameWon,
    matchWon,
    momentum,
    winProbability,
    matchStats,
    longestRuns,
    serveConversion,
    events,
  } = usePickleballGame();

  const [activeView, setActiveView] = useState<ViewTab>('scoring');
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [keepAwake, setKeepAwake] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // Only hold the screen awake during a live match, not on a finished one.
  const matchIsLive = Boolean(gameState) && !matchWon.isWon;
  const wakeLock = useWakeLock(keepAwake && matchIsLive);

  const isDialogOpen = setupModalOpen || confirmResetOpen;

  const handleResetRequest = useCallback(() => {
    if (!gameState || !gameState.isMatchStarted) {
      resetGame();
    } else {
      setConfirmResetOpen(true);
    }
  }, [gameState, resetGame]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isDialogOpen || e.metaKey || e.ctrlKey || e.altKey) return;

      // Never hijack typing.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      // Space is how a keyboard user activates the focused control. Claiming
      // it globally would score a point when they meant to press that button.
      if (e.key === ' ' && target?.closest('button, a, [role="menuitem"]')) {
        return;
      }

      const scoringLocked = gameWon.isWon || matchWon.isWon;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'p':
          if (scoringLocked) return;
          e.preventDefault();
          scorePoint();
          break;
        case 'f':
          if (scoringLocked) return;
          e.preventDefault();
          recordFault();
          break;
        case 'z':
          if (!canUndo) return;
          e.preventDefault();
          undo();
          break;
        case 'n':
          if (!gameWon.isWon || matchWon.isWon) return;
          e.preventDefault();
          startNextGame();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          e.preventDefault();
          setActiveView(NAV_ITEMS[Number(e.key) - 1].id);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    isDialogOpen,
    gameWon.isWon,
    matchWon.isWon,
    canUndo,
    scorePoint,
    recordFault,
    undo,
    startNextGame,
  ]);

  // ── Dismiss the overflow menu on outside click / Escape ──────────────────
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center" style={{ background: 'var(--kc-bg)' }}>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full kinetic-gradient animate-pulse" />
          <span
            className="font-lexend text-sm uppercase tracking-[0.3em]"
            style={{ color: 'var(--kc-text-dim)' }}
          >
            Loading Match...
          </span>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex h-dvh items-center justify-center px-6" style={{ background: 'var(--kc-bg)' }}>
        <div className="text-center space-y-4">
          <p className="text-lg" style={{ color: 'var(--kc-text-dim)' }}>
            Could not load the saved match.
          </p>
          <button
            onClick={resetGame}
            className="px-6 py-3 rounded-full font-lexend font-bold text-sm uppercase tracking-widest kinetic-gradient cursor-pointer"
            style={{ color: 'var(--kc-on-accent)' }}
          >
            Start a New Match
          </button>
        </div>
      </div>
    );
  }

  const servingTeam = gameState.serving.team;
  const servingTeamName = gameState.teams[servingTeam].name;
  const matchMode = safeMatchMode(gameState.matchMode);
  const winnerName =
    matchWon.winner ? gameState.teams[matchWon.winner].name : '';
  const gameWinnerName = gameWon.winner ? gameState.teams[gameWon.winner].name : '';

  const menuItems: { icon: string; label: string; onClick: () => void; danger?: boolean }[] = [
    {
      icon: 'settings',
      label: 'Match setup',
      onClick: () => setSetupModalOpen(true),
    },
    {
      icon: keepAwake ? 'visibility' : 'visibility_off',
      label: keepAwake ? 'Keep screen awake: on' : 'Keep screen awake: off',
      onClick: () => setKeepAwake(v => !v),
    },
    {
      icon: 'restart_alt',
      label: 'Reset match',
      onClick: handleResetRequest,
      danger: true,
    },
  ];

  return (
    <div className="min-h-dvh" style={{ background: 'var(--kc-bg)' }}>
      {/* Score announcements for assistive tech, without visual duplication. */}
      <div className="sr-only" role="status" aria-live="polite">
        {gameState.teams.A.name} {gameState.teams.A.score}, {gameState.teams.B.name}{' '}
        {gameState.teams.B.score}. {servingTeamName} serving, server{' '}
        {gameState.serving.serverNumber}.
      </div>

      {/* ========== TOP APP BAR ========== */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-4 md:px-6 py-4"
        style={{ background: 'var(--kc-bg)' }}
      >
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <img
            src="/kitchen_counter.png"
            alt=""
            className="w-8 h-8 rounded-lg outline outline-1 outline-[var(--kc-outline-dim)] shrink-0"
          />
          <h1
            className="text-2xl font-black italic tracking-widest font-lexend uppercase hidden sm:block truncate"
            style={{ color: 'var(--kc-accent)' }}
          >
            Kitchen Counter
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {wakeLock.isActive && (
            <span
              className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-lexend font-bold uppercase tracking-widest"
              style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text-dim)' }}
              title="The screen will stay on while the match is live"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">visibility</span>
              Screen on
            </span>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Match options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="transition-colors cursor-pointer p-2 rounded-full hover:text-[var(--kc-accent)]"
              style={{ color: menuOpen ? 'var(--kc-accent)' : 'var(--kc-text-dim)' }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">settings</span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 rounded-2xl overflow-hidden shadow-2xl animate-fade-in z-50"
                style={{ background: 'var(--kc-surface-high)', border: '1px solid var(--kc-outline-dim)' }}
              >
                {menuItems.map(item => (
                  <button
                    key={item.label}
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      item.onClick();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-[var(--kc-surface-highest)]"
                    style={{ color: item.danger ? 'var(--kc-error)' : 'var(--kc-text)' }}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="font-inter text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========== VIEW CONTENT ========== */}
      {activeView === 'players' ? (
        <main className="pt-14 md:pt-16 pb-[68px] md:pb-28 h-dvh animate-fade-in">
          <PlayersView
            gameState={gameState}
            matchWon={matchWon}
            momentum={momentum}
            matchStats={matchStats}
            longestRuns={longestRuns}
            onEditPlayers={() => setSetupModalOpen(true)}
          />
        </main>
      ) : (
        <main className="pt-20 px-4 max-w-5xl mx-auto pb-28 md:pb-36 w-full">
          {storageError && (
            <div
              role="alert"
              className="mb-4 rounded-2xl px-4 py-3 text-sm font-inter"
              style={{ background: 'var(--kc-surface-high)', color: 'var(--kc-error)' }}
            >
              {storageError}
            </div>
          )}

          {/* Match Won / Game Won Banners */}
          {matchWon.isWon ? (
            <div
              className="mb-6 rounded-[32px] p-8 text-center animate-fade-in"
              style={{ background: 'var(--kc-accent-container)', color: 'var(--kc-on-accent)' }}
            >
              <span className="material-symbols-outlined text-6xl mb-4" aria-hidden="true">trophy</span>
              <h2 className="font-lexend font-black text-2xl md:text-3xl uppercase tracking-widest mb-2 wrap-break-words">
                {winnerName} wins the match
              </h2>
              <p className="font-lexend text-lg opacity-80 uppercase tracking-widest">
                {matchMode === 'casual'
                  ? `${gameState.teams.A.score} — ${gameState.teams.B.score}`
                  : `Games ${gameState.gamesWon?.A ?? 0} — ${gameState.gamesWon?.B ?? 0}`}
              </p>
            </div>
          ) : gameWon.isWon ? (
            <div
              className="mb-6 rounded-3xl p-6 text-center animate-fade-in"
              style={{ background: 'var(--kc-surface-high)', border: '2px solid var(--kc-accent)' }}
            >
              <h3
                className="font-lexend font-bold text-xl uppercase tracking-widest mb-1 wrap-break-words"
                style={{ color: 'var(--kc-accent)' }}
              >
                {gameWinnerName} wins game {gameState.currentGame}
              </h3>
              <p className="text-sm font-medium" style={{ color: 'var(--kc-text-dim)' }}>
                Switch ends, then start the next game when you&apos;re ready.
              </p>
            </div>
          ) : null}

          {/* Game State Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-6 animate-fade-in">
            <Chip background="var(--kc-secondary)" color="var(--kc-secondary-text)">
              Doubles • {MATCH_MODES[matchMode].label}
            </Chip>
            <Chip background="var(--kc-surface-highest)" color="var(--kc-text)">
              Game {gameState.currentGame}
              {matchMode !== 'casual' && ` of ${MATCH_MODES[matchMode].totalGames}`}
            </Chip>
            {!gameWon.isWon && !matchWon.isWon && (
              <Chip background="var(--kc-surface-highest)" color="var(--kc-accent)" className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--kc-accent)' }} />
                Live
              </Chip>
            )}
            {gamePoint.isGamePoint && (
              <Chip background="var(--kc-accent)" color="var(--kc-on-accent)" className="animate-pulse-glow">
                {matchPoint.isMatchPoint ? 'Match point' : 'Game point'} —{' '}
                {gamePoint.team ? gameState.teams[gamePoint.team].name : ''}
              </Chip>
            )}
            {momentum.streak.team && momentum.streak.count >= 3 && !gameWon.isWon && !matchWon.isWon && (
              <Chip background="var(--kc-surface-highest)" color="var(--kc-text)">
                🔥 {momentum.streak.count} streak
              </Chip>
            )}
          </div>

          {/* View Content */}
          <div className="space-y-6 animate-fade-in">
            {activeView === 'scoring' && (
              <>
                <ScoreDisplay
                  gameState={gameState}
                  servingTeam={servingTeam}
                  servingPlayerIndex={servingPlayerIndex}
                  lastAction={lastAction}
                  gamePoint={gamePoint}
                  matchPoint={matchPoint}
                />
                <ControlPanel
                  onScorePoint={scorePoint}
                  onFault={recordFault}
                  onResetRequest={handleResetRequest}
                  onRestartMatch={resetGameKeepSettings}
                  onNextGame={startNextGame}
                  onUndo={undo}
                  canUndo={canUndo}
                  isGameWon={gameWon.isWon}
                  isMatchWon={matchWon.isWon}
                  servingTeamName={servingTeamName}
                  serverNumber={gameState.serving.serverNumber}
                />
                <CourtDiagram
                  gameState={gameState}
                  servingTeam={servingTeam}
                  serverPosition={serverPosition}
                  servingPlayerIndex={servingPlayerIndex}
                  receivingPlayerIndex={receivingPlayerIndex}
                />
              </>
            )}

            {activeView === 'stats' && (
              <StatsView
                gameState={gameState}
                scoreCall={scoreCall}
                momentum={momentum}
                gamePoint={gamePoint}
                matchPoint={matchPoint}
                winProbability={winProbability}
                matchStats={matchStats}
                longestRuns={longestRuns}
                serveConversion={serveConversion}
              />
            )}

            {activeView === 'history' && <HistoryView events={events} gameState={gameState} />}
          </div>
        </main>
      )}

      {/* ========== BOTTOM NAVIGATION ========== */}
      <nav
        aria-label="Views"
        className="fixed bottom-0 left-0 w-full flex justify-around items-center px-2 z-50
                   pt-1.5 md:pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-[max(1.5rem,env(safe-area-inset-bottom))]
                   rounded-t-3xl md:rounded-t-[32px]"
        style={{
          background: 'rgba(9, 14, 21, 0.9)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(209, 255, 0, 0.1)',
          boxShadow: '0 -8px 24px rgba(209, 255, 0, 0.05)',
        }}
      >
        {NAV_ITEMS.map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center px-3 sm:px-6 py-1.5 md:py-2 transition-all duration-200 active:scale-90 cursor-pointer"
              style={{
                background: isActive ? 'var(--kc-accent)' : 'transparent',
                color: isActive ? 'var(--kc-bg)' : 'var(--kc-text-dim)',
                borderRadius: isActive ? '9999px' : '0',
              }}
            >
              <span
                className="material-symbols-outlined text-[18px] md:text-[20px] leading-none mb-0.5"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className="font-lexend text-[9px] md:text-[10px] leading-none uppercase tracking-widest font-semibold">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ========== MODALS ========== */}
      <PlayerSetupModal
        open={setupModalOpen}
        onOpenChange={setSetupModalOpen}
        teamAName={gameState.teams.A.name}
        teamBName={gameState.teams.B.name}
        teamAPlayers={gameState.teams.A.players}
        teamBPlayers={gameState.teams.B.players}
        currentMatchMode={matchMode}
        isMatchStarted={gameState.isMatchStarted}
        onSave={updateMatchSettings}
      />

      <ConfirmResetDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        onConfirm={resetGame}
        onConfirmKeepSettings={resetGameKeepSettings}
      />
    </div>
  );
}
