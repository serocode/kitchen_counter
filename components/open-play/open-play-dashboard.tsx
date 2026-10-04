'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OpenPlay } from '@/hooks/useOpenPlay';
import type { CourtScore } from '@/hooks/useCourtScoreboard';
import { useNow } from '@/hooks/useNow';
import { MATCHING_MODES, OpenPlaySession, getPlayerName } from '@/lib/open-play';
import { AppHeader, type AppSection, type MenuItem } from '@/components/app-header';
import { BottomNav, type NavItem } from '@/components/bottom-nav';
import { Chip } from '@/components/ui/chip';
import { CourtsView } from './courts-view';
import { PlayersRoster } from './players-roster';
import { StandingsView } from './standings-view';
import { SessionSetupDialog } from './session-setup-dialog';
import { RecordScoreDialog } from './record-score-dialog';
import { EditPlayerDialog } from './edit-player-dialog';
import { EndSessionDialog } from './end-session-dialog';
import type { PlayerChip } from './shared';

type ViewTab = 'courts' | 'players' | 'standings';

const NAV_ITEMS: NavItem<ViewTab>[] = [
  { id: 'courts', icon: 'sports_tennis', label: 'Courts' },
  { id: 'players', icon: 'group', label: 'Players' },
  { id: 'standings', icon: 'leaderboard', label: 'Standings' },
];

interface OpenPlayDashboardProps {
  openPlay: OpenPlay;
  session: OpenPlaySession;
  derived: NonNullable<OpenPlay['derived']>;
  onSectionChange: (section: AppSection) => void;
  keepAwake: boolean;
  onToggleKeepAwake: () => void;
  wakeLockActive: boolean;
  /** Scoreboard games kept for court matches, keyed by match id. */
  courtScores: Map<string, CourtScore>;
  onKeepScore: (courtId: string) => void;
  onRecordScoreboard: (courtId: string) => void;
}

export function OpenPlayDashboard({
  openPlay,
  session,
  derived,
  onSectionChange,
  keepAwake,
  onToggleKeepAwake,
  wakeLockActive,
  courtScores,
  onKeepScore,
  onRecordScoreboard,
}: OpenPlayDashboardProps) {
  const [activeView, setActiveView] = useState<ViewTab>('courts');
  const [setupOpen, setSetupOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scoringCourtId, setScoringCourtId] = useState<string | null>(null);
  const now = useNow(15_000);

  const { waiting, blocked, statuses, records, standings, lastUndoLabel } = derived;
  const { undo } = openPlay;
  const isDialogOpen = setupOpen || endOpen || editingId !== null || scoringCourtId !== null;

  const playersById = useMemo(() => new Map(session.players.map(p => [p.id, p])), [session.players]);

  const { photos } = openPlay;
  const resolve = useCallback(
    (id: string): PlayerChip => {
      const player = playersById.get(id);
      return {
        id,
        name: player?.name ?? getPlayerName(session, id),
        skill: player?.skill ?? null,
        photo: photos[id],
        partnerId: player?.partnerId,
      };
    },
    [playersById, session, photos],
  );

  // ── Keyboard: 1–3 switch views, Z undoes ─────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isDialogOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === '1' || key === '2' || key === '3') {
        e.preventDefault();
        setActiveView(NAV_ITEMS[Number(key) - 1].id);
      } else if (key === 'z' && lastUndoLabel) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDialogOpen, lastUndoLabel, undo]);

  const menuItems: MenuItem[] = [
    { icon: 'tune', label: 'Session setup', onClick: () => setSetupOpen(true) },
    {
      icon: keepAwake ? 'visibility' : 'visibility_off',
      label: keepAwake ? 'Keep screen awake: on' : 'Keep screen awake: off',
      onClick: onToggleKeepAwake,
    },
    { icon: 'restart_alt', label: 'End session', onClick: () => setEndOpen(true), danger: true },
  ];

  const checkedIn = session.players.filter(p => p.active).length;
  const courtsInPlay = session.courts.filter(c => c.match).length;
  const editingPlayer = editingId ? (playersById.get(editingId) ?? null) : null;
  const scoringCourt = session.courts.find(c => c.id === scoringCourtId && c.match) ?? null;
  const upNextAnnouncement = session.upNext
    ? `Up next: ${session.upNext.map(team => team.map(id => resolve(id).name).join(' and ')).join(' versus ')}.`
    : '';

  return (
    <div className="min-h-dvh" style={{ background: 'var(--kc-bg)' }}>
      <div className="sr-only" role="status" aria-live="polite">
        {upNextAnnouncement}
      </div>

      <AppHeader
        section="open-play"
        onSectionChange={onSectionChange}
        menuItems={menuItems}
        menuLabel="Session options"
        wakeLockActive={wakeLockActive}
      />

      <main className="pt-20 px-4 max-w-5xl mx-auto pb-28 md:pb-36 w-full">
        {openPlay.storageError && (
          <div
            role="alert"
            className="mb-4 rounded-2xl px-4 py-3 text-sm font-inter"
            style={{ background: 'var(--kc-surface-high)', color: 'var(--kc-error)' }}
          >
            {openPlay.storageError}
          </div>
        )}

        {/* Session status chips, with undo on the right */}
        <div className="flex flex-wrap items-center gap-2 mb-6 animate-fade-in">
          <Chip background="var(--kc-secondary)" color="var(--kc-secondary-text)">
            Open play • {MATCHING_MODES[session.mode].label}
          </Chip>
          <Chip background="var(--kc-surface-highest)" color="var(--kc-text)">
            {checkedIn} checked in
          </Chip>
          <Chip background="var(--kc-surface-highest)" color="var(--kc-text)">
            {session.courts.length} {session.courts.length === 1 ? 'court' : 'courts'}
          </Chip>
          {courtsInPlay > 0 && (
            <Chip background="var(--kc-surface-highest)" color="var(--kc-accent)" className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--kc-accent)' }} />
              {courtsInPlay} live
            </Chip>
          )}
          {lastUndoLabel && (
            <button
              type="button"
              onClick={undo}
              title={`Undo: ${lastUndoLabel}`}
              aria-label={`Undo: ${lastUndoLabel}`}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-lexend font-bold uppercase tracking-widest transition-all active:scale-95 cursor-pointer max-w-[60%]"
              style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text)' }}
            >
              <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--kc-error)' }} aria-hidden="true">
                undo
              </span>
              <span>Undo</span>
              <span className="hidden sm:inline truncate normal-case tracking-normal font-inter font-medium" style={{ color: 'var(--kc-text-dim)' }}>
                {lastUndoLabel}
              </span>
            </button>
          )}
        </div>

        <div className="animate-fade-in">
          {activeView === 'courts' && (
            <CourtsView
              session={session}
              waiting={waiting}
              blocked={blocked}
              records={records}
              resolve={resolve}
              now={now}
              courtScores={courtScores}
              onAddPlayers={() => setActiveView('players')}
              onShuffle={openPlay.shuffleUpNext}
              onStart={openPlay.startMatch}
              onFillCourts={openPlay.fillOpenCourts}
              onWin={(courtId, winner) => openPlay.finishMatch(courtId, winner, null)}
              onEnterScore={setScoringCourtId}
              onKeepScore={onKeepScore}
              onRecordScoreboard={onRecordScoreboard}
              onCancel={openPlay.cancelMatch}
              onSetActive={openPlay.setPlayerActive}
            />
          )}

          {activeView === 'players' && (
            <PlayersRoster
              session={session}
              statuses={statuses}
              records={records}
              photos={photos}
              onAdd={openPlay.addPlayers}
              onSetPhoto={openPlay.setPhoto}
              onSetActive={openPlay.setPlayerActive}
              onEdit={setEditingId}
            />
          )}

          {activeView === 'standings' && (
            <StandingsView
              standings={standings}
              results={session.results}
              photos={photos}
              playerName={id => resolve(id).name}
              unplayedCount={session.players.length - standings.length}
              onDeleteResult={openPlay.deleteResult}
            />
          )}
        </div>
      </main>

      <BottomNav items={NAV_ITEMS} active={activeView} onChange={setActiveView} />

      <SessionSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        session={session}
        onCourtCount={openPlay.setCourtCount}
        onMode={openPlay.setMatchingMode}
        onAutoStart={openPlay.setAutoStart}
      />

      <RecordScoreDialog
        court={scoringCourt}
        resolve={resolve}
        onOpenChange={open => !open && setScoringCourtId(null)}
        onSave={(winner, score) => scoringCourt && openPlay.finishMatch(scoringCourt.id, winner, score)}
      />

      <EditPlayerDialog
        player={editingPlayer}
        photo={editingId ? photos[editingId] : undefined}
        onCourt={editingId ? statuses.get(editingId)?.kind === 'court' : false}
        takenNames={new Set(session.players.map(p => p.name.toLowerCase()))}
        others={session.players.filter(p => p.id !== editingId)}
        onOpenChange={open => !open && setEditingId(null)}
        onSave={(changes, photo, partnerId) => {
          if (!editingId) return;
          openPlay.updatePlayer(editingId, changes);
          if (photo !== undefined) openPlay.setPhoto(editingId, photo);
          if (partnerId !== (editingPlayer?.partnerId ?? null)) openPlay.setPartner(editingId, partnerId);
        }}
        onRemove={() => editingId && openPlay.removePlayer(editingId)}
      />

      <EndSessionDialog
        open={endOpen}
        onOpenChange={setEndOpen}
        onKeepRoster={() => openPlay.resetSession(true)}
        onClearAll={() => openPlay.resetSession(false)}
      />
    </div>
  );
}
