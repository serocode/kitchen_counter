'use client';

import type { OpenPlayer, OpenPlaySession, PlayerRecord } from '@/lib/open-play';
import { PLAYERS_PER_MATCH, getRecord } from '@/lib/open-play';
import type { CourtScore } from '@/hooks/useCourtScoreboard';
import { CourtCard } from './court-card';
import { Avatar, EmptyState, IconButton, PlayerChip, SectionHeading, SkillBadge, TeamBlock } from './shared';

interface CourtsViewProps {
  session: OpenPlaySession;
  waiting: OpenPlayer[];
  records: Map<string, PlayerRecord>;
  resolve: (id: string) => PlayerChip;
  now: number;
  /** Scoreboard games kept for court matches, keyed by match id. */
  courtScores: Map<string, CourtScore>;
  onAddPlayers: () => void;
  onShuffle: () => void;
  onStart: (courtId: string) => void;
  onFillCourts: () => void;
  onWin: (courtId: string, winner: 0 | 1) => void;
  onEnterScore: (courtId: string) => void;
  onKeepScore: (courtId: string) => void;
  onRecordScoreboard: (courtId: string) => void;
  onCancel: (courtId: string) => void;
  onSetActive: (playerId: string, active: boolean) => void;
}

export function CourtsView({
  session,
  waiting,
  records,
  resolve,
  now,
  courtScores,
  onAddPlayers,
  onShuffle,
  onStart,
  onFillCourts,
  onWin,
  onEnterScore,
  onKeepScore,
  onRecordScoreboard,
  onCancel,
  onSetActive,
}: CourtsViewProps) {
  if (session.players.length === 0) {
    return (
      <EmptyState icon="group_add" title="No players yet">
        <p className="text-sm mb-6" style={{ color: 'var(--kc-text-muted)' }}>
          Check players in with a skill level and Kitchen Counter will build the matches.
        </p>
        <button
          type="button"
          onClick={onAddPlayers}
          className="px-6 py-3 rounded-full font-lexend font-bold text-sm uppercase tracking-widest kinetic-gradient transition-all active:scale-95 cursor-pointer"
          style={{ color: 'var(--kc-on-accent)' }}
        >
          Add players
        </button>
      </EmptyState>
    );
  }

  const openCourts = session.courts.filter(c => !c.match);
  const upNext = session.upNext;
  const upNextIds = new Set(upNext?.flat() ?? []);
  const sittingOut = session.players
    .filter(p => !p.active)
    .sort((a, b) => a.name.localeCompare(b.name));
  const shortBy = PLAYERS_PER_MATCH - waiting.length;

  return (
    <div className="space-y-8">
      {/* ===== UP NEXT ===== */}
      <section
        aria-labelledby="up-next-title"
        className="rounded-[28px] p-4 md:p-5 space-y-3"
        style={{
          background: 'var(--kc-surface-mid)',
          outline: upNext ? '2px solid var(--kc-accent)' : '1px solid var(--kc-outline-dim)',
          outlineOffset: '-1px',
          boxShadow: upNext ? '0 0 28px var(--kc-accent-glow)' : 'none',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id="up-next-title"
            className="font-lexend font-black text-sm uppercase tracking-widest"
            style={{ color: upNext ? 'var(--kc-accent)' : 'var(--kc-text-dim)' }}
          >
            Up next
          </h2>
          {upNext && (
            <button
              type="button"
              onClick={onShuffle}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-lexend font-bold uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
              style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text)' }}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">shuffle</span>
              Shuffle
            </button>
          )}
        </div>

        {upNext ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <TeamBlock side={0} players={upNext[0].map(resolve)} highlight />
              <TeamBlock side={1} players={upNext[1].map(resolve)} highlight />
            </div>

            {openCourts.length > 0 ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => onStart(openCourts[0].id)}
                  className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-lexend font-bold text-xs uppercase tracking-widest kinetic-gradient transition-all active:scale-95 cursor-pointer"
                  style={{ color: 'var(--kc-on-accent)' }}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">play_arrow</span>
                  Start on {openCourts[0].name}
                </button>
                {openCourts.length > 1 && (
                  <button
                    type="button"
                    onClick={onFillCourts}
                    className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-lexend font-bold text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
                    style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text)' }}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">grid_view</span>
                    Fill all {openCourts.length} open courts
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs font-inter" style={{ color: 'var(--kc-text-dim)' }}>
                {session.autoStart
                  ? 'Goes on automatically when the next result is recorded.'
                  : 'Plays on the next court to open.'}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm font-inter" style={{ color: 'var(--kc-text-dim)' }}>
            {waiting.length === 0
              ? 'Everyone checked in is on a court. The next match is drawn when a result comes in.'
              : `${waiting.length} waiting — ${shortBy} more needed for a match. Players rejoin the line when their result is recorded.`}
          </p>
        )}
      </section>

      {/* ===== COURTS ===== */}
      <section aria-labelledby="courts-title" className="space-y-4">
        <SectionHeading
          id="courts-title"
          title="Courts"
          aside={
            <span className="text-[10px] shrink-0" style={{ color: 'var(--kc-text-dim)' }}>
              {session.courts.length - openCourts.length} of {session.courts.length} in play
            </span>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {session.courts.map(court => (
            <CourtCard
              key={court.id}
              court={court}
              resolve={resolve}
              now={now}
              canStart={Boolean(upNext)}
              scoreboard={court.match ? courtScores.get(court.match.id) : undefined}
              onRecordScoreboard={() => onRecordScoreboard(court.id)}
              onStart={() => onStart(court.id)}
              onWin={winner => onWin(court.id, winner)}
              onEnterScore={() => onEnterScore(court.id)}
              onKeepScore={() => onKeepScore(court.id)}
              onCancel={() => onCancel(court.id)}
            />
          ))}
        </div>
      </section>

      {/* ===== QUEUE ===== */}
      <section aria-labelledby="queue-title" className="space-y-4">
        <SectionHeading
          id="queue-title"
          title="Queue"
          aside={
            <span className="text-[10px] shrink-0" style={{ color: 'var(--kc-text-dim)' }}>
              {waiting.length} waiting
            </span>
          }
        />

        {waiting.length === 0 ? (
          <p className="text-sm font-inter" style={{ color: 'var(--kc-text-muted)' }}>
            Nobody is waiting.
          </p>
        ) : (
          <ol className="space-y-2">
            {waiting.map((player, index) => {
              const isUpNext = upNextIds.has(player.id);
              const { games } = getRecord(records, player.id);
              return (
                <li
                  key={player.id}
                  className="flex items-center gap-2.5 sm:gap-3 rounded-2xl pl-3 sm:pl-4 pr-2 py-2"
                  style={{ background: 'var(--kc-surface-mid)' }}
                >
                  <span
                    className="w-6 shrink-0 text-center font-lexend font-black text-sm tabular-nums"
                    style={{ color: isUpNext ? 'var(--kc-accent)' : 'var(--kc-text-muted)' }}
                  >
                    {index + 1}
                  </span>
                  <Avatar name={player.name} photo={resolve(player.id).photo} size={32} />
                  <span className="flex-1 min-w-0 truncate text-sm font-semibold" style={{ color: 'var(--kc-text)' }}>
                    {player.name}
                  </span>
                  {isUpNext && (
                    <span
                      className="hidden sm:inline px-2 py-0.5 rounded-full text-[9px] font-lexend font-bold uppercase tracking-widest shrink-0"
                      style={{ background: 'var(--kc-accent)', color: 'var(--kc-on-accent)' }}
                    >
                      Up next
                    </span>
                  )}
                  <span className="hidden sm:inline text-[10px] tabular-nums shrink-0" style={{ color: 'var(--kc-text-muted)' }}>
                    {games} {games === 1 ? 'game' : 'games'}
                  </span>
                  <SkillBadge skill={player.skill} />
                  <IconButton
                    icon="pause_circle"
                    label={`Sit out ${player.name}`}
                    onClick={() => onSetActive(player.id, false)}
                  />
                </li>
              );
            })}
          </ol>
        )}

        {sittingOut.length > 0 && (
          <div className="space-y-2">
            <span
              className="block text-[10px] font-lexend font-bold uppercase tracking-widest"
              style={{ color: 'var(--kc-text-muted)' }}
            >
              Sitting out — tap to check back in
            </span>
            <div className="flex flex-wrap gap-2">
              {sittingOut.map(player => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onSetActive(player.id, true)}
                  aria-label={`Check ${player.name} back in`}
                  className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-xs font-inter font-semibold transition-all active:scale-95 cursor-pointer"
                  style={{ background: 'var(--kc-surface-high)', color: 'var(--kc-text-dim)' }}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">play_circle</span>
                  {player.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
