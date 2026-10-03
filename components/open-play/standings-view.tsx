'use client';

import { useState } from 'react';
import type { MatchResult, Standing } from '@/lib/open-play';
import type { PhotoMap } from '@/hooks/useOpenPlay';
import { Avatar, EmptyState, IconButton, SectionHeading, SkillBadge, TEAM_COLORS } from './shared';

/** Results rendered before the "show all" affordance kicks in. */
const VISIBLE_RESULT_LIMIT = 15;

interface StandingsViewProps {
  standings: Standing[];
  /** Oldest → newest, as stored. */
  results: MatchResult[];
  photos: PhotoMap;
  playerName: (id: string) => string;
  /** Players on the roster who have not finished a game yet. */
  unplayedCount: number;
  onDeleteResult: (id: string) => void;
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDiff(diff: number): string {
  return diff > 0 ? `+${diff}` : diff < 0 ? `−${Math.abs(diff)}` : '0';
}

export function StandingsView({
  standings,
  results,
  photos,
  playerName,
  unplayedCount,
  onDeleteResult,
}: StandingsViewProps) {
  const [showAll, setShowAll] = useState(false);

  if (results.length === 0) {
    return (
      <EmptyState icon="leaderboard" title="No games recorded yet">
        <p className="text-sm" style={{ color: 'var(--kc-text-muted)' }}>
          Standings fill in as you record who won on each court.
        </p>
      </EmptyState>
    );
  }

  // Point differential only means something once scores are being entered.
  const showDiff = results.some(r => r.score);
  const newestFirst = [...results].reverse();
  const visible = showAll ? newestFirst : newestFirst.slice(0, VISIBLE_RESULT_LIMIT);
  const hiddenCount = newestFirst.length - visible.length;

  return (
    <div className="space-y-8">
      {/* ===== LEADERBOARD ===== */}
      <section aria-labelledby="standings-title" className="space-y-4">
        <SectionHeading
          id="standings-title"
          title="Standings"
          aside={
            <span className="text-[10px] shrink-0" style={{ color: 'var(--kc-text-dim)' }}>
              {results.length} {results.length === 1 ? 'game' : 'games'}
            </span>
          }
        />

        <div className="rounded-[28px] overflow-hidden" style={{ background: 'var(--kc-surface)' }}>
          <table className="w-full text-left">
            <caption className="sr-only">
              Ranked by wins, then win rate{showDiff ? ', then point differential' : ''}.
            </caption>
            <thead>
              <tr
                className="font-lexend text-[9px] md:text-[10px] uppercase tracking-widest"
                style={{ color: 'var(--kc-text-muted)' }}
              >
                <th scope="col" className="pl-4 md:pl-6 pr-2 py-3 w-10 font-bold">#</th>
                <th scope="col" className="px-2 py-3 font-bold">Player</th>
                <th scope="col" className="px-2 py-3 font-bold text-right">W–L</th>
                <th scope="col" className="px-2 py-3 font-bold text-right">Win %</th>
                {showDiff && (
                  <th scope="col" className="pl-2 pr-4 md:pr-6 py-3 font-bold text-right">
                    <abbr title="Point differential" className="no-underline">+/−</abbr>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {standings.map(row => {
                const isLeader = row.rank === 1;
                return (
                  <tr key={row.player.id} style={{ borderTop: '1px solid var(--kc-outline-dim)' }}>
                    <td
                      className="pl-4 md:pl-6 pr-2 py-3 font-lexend font-black text-sm tabular-nums"
                      style={{ color: isLeader ? 'var(--kc-accent)' : 'var(--kc-text-dim)' }}
                    >
                      {row.rank}
                    </td>
                    <th scope="row" className="px-2 py-3 font-normal min-w-0">
                      <span className="flex items-center gap-2 min-w-0">
                        <Avatar name={row.player.name} photo={photos[row.player.id]} size={28} />
                        <span
                          className="text-sm font-semibold truncate max-w-[7.5rem] sm:max-w-none"
                          style={{ color: 'var(--kc-text)' }}
                        >
                          {row.player.name}
                        </span>
                        <span className="hidden sm:inline-flex">
                          <SkillBadge skill={row.player.skill} />
                        </span>
                      </span>
                    </th>
                    <td className="px-2 py-3 text-right font-lexend font-bold text-sm tabular-nums" style={{ color: 'var(--kc-text)' }}>
                      {row.wins}–{row.losses}
                    </td>
                    <td className="px-2 py-3 text-right text-sm tabular-nums" style={{ color: 'var(--kc-text-dim)' }}>
                      {Math.round(row.winRate * 100)}%
                    </td>
                    {showDiff && (
                      <td
                        className="pl-2 pr-4 md:pr-6 py-3 text-right text-sm tabular-nums"
                        style={{ color: row.pointDiff > 0 ? 'var(--kc-accent)' : 'var(--kc-text-dim)' }}
                      >
                        {formatDiff(row.pointDiff)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {unplayedCount > 0 && (
          <p className="text-xs font-inter" style={{ color: 'var(--kc-text-muted)' }}>
            {unplayedCount} {unplayedCount === 1 ? 'player has' : 'players have'} not finished a game yet.
          </p>
        )}
      </section>

      {/* ===== RECENT GAMES ===== */}
      <section aria-labelledby="results-title" className="space-y-4">
        <SectionHeading id="results-title" title="Recent games" />
        <ul className="space-y-2">
          {visible.map(result => {
            const minutes = Math.max(1, Math.round((result.endedAt - result.startedAt) / 60_000));
            return (
              <li
                key={result.id}
                className="rounded-2xl pl-4 pr-1.5 py-3 flex items-center gap-3"
                style={{ background: 'var(--kc-surface-mid)' }}
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p
                    className="font-lexend text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--kc-text-muted)' }}
                  >
                    {result.courtName} · {formatClock(result.endedAt)} · {minutes} min
                  </p>
                  {result.teams.map((team, side) => {
                    const won = result.winner === side;
                    return (
                      <div key={side} className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-1 h-4 rounded-full shrink-0"
                          style={{ background: TEAM_COLORS[side] }}
                          aria-hidden="true"
                        />
                        <span
                          className={`text-sm truncate ${won ? 'font-bold' : ''}`}
                          style={{ color: won ? 'var(--kc-text)' : 'var(--kc-text-dim)' }}
                        >
                          {team.map(playerName).join(' & ')}
                        </span>
                        {won && (
                          <span
                            className="material-symbols-outlined text-[16px] shrink-0"
                            style={{ color: 'var(--kc-accent)', fontVariationSettings: "'FILL' 1" }}
                            aria-label="Won"
                          >
                            emoji_events
                          </span>
                        )}
                        {result.score && (
                          <span
                            className="ml-auto font-lexend font-black text-base tabular-nums shrink-0"
                            style={{ color: won ? 'var(--kc-text)' : 'var(--kc-text-muted)' }}
                          >
                            {result.score[side]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <IconButton
                  icon="delete"
                  label={`Delete ${result.courtName} result from ${formatClock(result.endedAt)}`}
                  danger
                  onClick={() => onDeleteResult(result.id)}
                />
              </li>
            );
          })}
        </ul>

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full py-3 rounded-2xl font-lexend text-[10px] font-bold uppercase tracking-widest transition-all active:scale-[0.99] cursor-pointer"
            style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text-dim)' }}
          >
            Show {hiddenCount} earlier {hiddenCount === 1 ? 'game' : 'games'}
          </button>
        )}
      </section>
    </div>
  );
}
