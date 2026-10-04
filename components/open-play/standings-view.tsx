'use client';

import { Fragment, useState } from 'react';
import type { MatchResult, Pair, Standing } from '@/lib/open-play';
import type { PhotoMap } from '@/hooks/useOpenPlay';
import {
  MIN_NOTABLE_STREAK,
  formatDiff,
  formatDuration,
  type Outcome,
  type PlayerInsights,
  type SessionHighlights,
} from '@/lib/open-play-stats';
import { Podium } from './podium';
import { ShareResults } from './share-results';
import { Avatar, EmptyState, IconButton, SectionHeading, SkillBadge, TEAM_COLORS, medalColor, tint } from './shared';

/** Results rendered before the "show all" affordance kicks in. */
const VISIBLE_RESULT_LIMIT = 15;

interface StandingsViewProps {
  standings: Standing[];
  /** Oldest → newest, as stored. */
  results: MatchResult[];
  insights: Map<string, PlayerInsights>;
  highlights: SessionHighlights;
  photos: PhotoMap;
  playerName: (id: string) => string;
  /** Players on the roster who have not finished a game yet. */
  unplayedCount: number;
  onDeleteResult: (id: string) => void;
  /** Open the end-of-session wrap-up. */
  onWrapUp: () => void;
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Signed to one decimal: "+2.3", "−1.0". */
function formatSigned(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded < 0 ? `−${Math.abs(rounded).toFixed(1)}` : '0.0';
}

const names = (pair: Pair, playerName: (id: string) => string) => pair.map(playerName).join(' & ');

/** A row of dots, one per recent game: lime for a win, hollow for a loss. */
function FormDots({ form }: { form: Outcome[] }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      role="img"
      aria-label={`Last ${form.length} games, oldest first: ${form.map(o => (o === 'W' ? 'win' : 'loss')).join(', ')}`}
    >
      {form.map((outcome, index) => (
        <span
          key={index}
          className="w-2 h-2 rounded-full"
          style={
            outcome === 'W'
              ? { background: 'var(--kc-accent)' }
              : { background: 'transparent', boxShadow: 'inset 0 0 0 1.5px var(--kc-text-muted)' }
          }
        />
      ))}
    </span>
  );
}

/** One standout moment of the session. */
function HighlightTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl p-3 min-w-0" style={{ background: 'var(--kc-surface-mid)' }}>
      <p
        className="flex items-center gap-1.5 font-lexend text-[9px] font-bold uppercase tracking-widest"
        style={{ color: 'var(--kc-text-muted)' }}
      >
        <span className="material-symbols-outlined text-[15px]" style={{ color: 'var(--kc-accent)' }} aria-hidden="true">
          {icon}
        </span>
        {label}
      </p>
      <p className="mt-1.5 font-lexend font-bold text-sm truncate" style={{ color: 'var(--kc-text)' }} title={value}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-inter leading-snug line-clamp-2" style={{ color: 'var(--kc-text-dim)' }}>
        {detail}
      </p>
    </div>
  );
}

function Highlights({
  highlights,
  playerName,
}: {
  highlights: SessionHighlights;
  playerName: (id: string) => string;
}) {
  const { games, avgGameMinutes, durationMinutes, longestStreak, biggestWin, duos } = highlights;
  const duo = duos[0];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <HighlightTile
        icon="sports_tennis"
        label="Games"
        value={`${games} played`}
        detail={`${Math.max(1, Math.round(avgGameMinutes))} min average · ${formatDuration(durationMinutes)} start to finish`}
      />
      {longestStreak && (
        <HighlightTile
          icon="local_fire_department"
          label="Hot streak"
          value={longestStreak.playerIds.map(playerName).join(' & ')}
          detail={`${longestStreak.count} wins in a row`}
        />
      )}
      {biggestWin && (
        <HighlightTile
          icon="bolt"
          label="Biggest win"
          value={`${biggestWin.score[0]}–${biggestWin.score[1]}`}
          detail={`${names(biggestWin.winners, playerName)} over ${names(biggestWin.losers, playerName)}`}
        />
      )}
      {duo && (
        <HighlightTile
          icon="handshake"
          label="Top duo"
          value={names(duo.ids, playerName)}
          detail={`${duo.wins}–${duo.games - duo.wins} together`}
        />
      )}
    </div>
  );
}

/** A labelled figure in a player's expanded card. */
function Metric({ label, children, detail }: { label: string; children: React.ReactNode; detail?: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-lexend text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--kc-text-muted)' }}>
        {label}
      </dt>
      <dd className="mt-1 font-lexend font-bold text-sm truncate" style={{ color: 'var(--kc-text)' }}>
        {children}
      </dd>
      {detail && (
        <dd className="mt-0.5 text-[11px] font-inter leading-snug" style={{ color: 'var(--kc-text-dim)' }}>
          {detail}
        </dd>
      )}
    </div>
  );
}

function PlayerDetails({
  row,
  insight,
  playerName,
}: {
  row: Standing;
  insight: PlayerInsights;
  playerName: (id: string) => string;
}) {
  const { streak, bestWinStreak, form, scoredGames, pointsFor, pointsAgainst, minutesPlayed, avgWaitMinutes, bestPartner } =
    insight;

  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
      {streak && (
        <Metric
          label="Streak"
          detail={bestWinStreak > 0 ? `Best run: ${bestWinStreak} ${bestWinStreak === 1 ? 'win' : 'wins'}` : undefined}
        >
          <span style={{ color: streak.kind === 'W' ? 'var(--kc-accent)' : 'var(--kc-text-dim)' }}>
            {streak.kind}
            {streak.count}
          </span>
        </Metric>
      )}
      <Metric label={`Last ${form.length}`}>
        <FormDots form={form} />
      </Metric>
      {scoredGames > 0 && (
        <>
          <Metric label="Avg score" detail={`for – against, ${scoredGames} ${scoredGames === 1 ? 'game' : 'games'}`}>
            {(pointsFor / scoredGames).toFixed(1)} – {(pointsAgainst / scoredGames).toFixed(1)}
          </Metric>
          <Metric label="Avg margin" detail="points per game">
            <span style={{ color: pointsFor > pointsAgainst ? 'var(--kc-accent)' : 'var(--kc-text)' }}>
              {formatSigned((pointsFor - pointsAgainst) / scoredGames)}
            </span>
          </Metric>
        </>
      )}
      <Metric label="Court time" detail={`over ${row.games} ${row.games === 1 ? 'game' : 'games'}`}>
        {formatDuration(minutesPlayed)}
      </Metric>
      {avgWaitMinutes !== null && (
        <Metric label="Avg wait" detail="between games">
          {formatDuration(avgWaitMinutes)}
        </Metric>
      )}
      {bestPartner && (
        <Metric
          label="Best partner"
          detail={`${bestPartner.wins}–${bestPartner.games - bestPartner.wins} together`}
        >
          {playerName(bestPartner.id)}
        </Metric>
      )}
    </dl>
  );
}

export function StandingsView({
  standings,
  results,
  insights,
  highlights,
  photos,
  playerName,
  unplayedCount,
  onDeleteResult,
  onWrapUp,
}: StandingsViewProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
  // Name, W–L, win %, form and the optional diff, plus the rank.
  const columnCount = 5 + (showDiff ? 1 : 0);
  const report = { standings, results, highlights, playerName };

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

        {standings.length >= 3 && (
          <div
            className="rounded-[28px] px-4 pt-7 overflow-hidden"
            style={{
              background: `radial-gradient(90% 70% at 50% 0%, ${tint('var(--kc-gold)', 14)} 0%, transparent 70%), var(--kc-surface)`,
              border: '1px solid var(--kc-outline-dim)',
            }}
          >
            <Podium standings={standings} photos={photos} />
          </div>
        )}

        <Highlights highlights={highlights} playerName={playerName} />

        <div className="rounded-[28px] overflow-hidden" style={{ background: 'var(--kc-surface)' }}>
          <table className="w-full text-left">
            <caption className="sr-only">
              Ranked by wins, then win rate{showDiff ? ', then point differential' : ''}. Select a player for more detail.
            </caption>
            <thead>
              <tr
                className="font-lexend text-[9px] md:text-[10px] uppercase tracking-widest"
                style={{ color: 'var(--kc-text-muted)' }}
              >
                <th scope="col" className="pl-4 md:pl-6 pr-2 py-3 w-12 font-bold">#</th>
                <th scope="col" className="px-2 py-3 font-bold">Player</th>
                <th scope="col" className="px-2 py-3 font-bold text-right">W–L</th>
                <th scope="col" className="px-2 py-3 font-bold text-right">Win %</th>
                {showDiff && (
                  <th scope="col" className="px-2 py-3 font-bold text-right">
                    <abbr title="Point differential" className="no-underline">+/−</abbr>
                  </th>
                )}
                <th scope="col" className="hidden sm:table-cell pl-2 pr-4 md:pr-6 py-3 font-bold text-right">
                  Form
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map(row => {
                const insight = insights.get(row.player.id);
                const medal = medalColor(row.rank);
                const isOpen = expandedId === row.player.id;
                const panelId = `player-detail-${row.player.id}`;
                const hot =
                  insight?.streak?.kind === 'W' && insight.streak.count >= MIN_NOTABLE_STREAK ? insight.streak.count : 0;

                return (
                  <Fragment key={row.player.id}>
                    <tr
                      style={{
                        borderTop: '1px solid var(--kc-outline-dim)',
                        background: isOpen ? 'var(--kc-surface-mid)' : medal ? tint(medal, 6) : undefined,
                      }}
                    >
                      <td className="pl-4 md:pl-6 pr-2 py-2.5">
                        {medal ? (
                          <span
                            className="flex items-center justify-center w-7 h-7 rounded-full font-lexend font-black text-xs tabular-nums"
                            style={{ background: tint(medal, 20), color: medal, boxShadow: `inset 0 0 0 1.5px ${medal}` }}
                          >
                            {row.rank}
                          </span>
                        ) : (
                          <span
                            className="flex items-center justify-center w-7 h-7 font-lexend font-black text-sm tabular-nums"
                            style={{ color: 'var(--kc-text-dim)' }}
                          >
                            {row.rank}
                          </span>
                        )}
                      </td>
                      <th scope="row" className="px-2 py-2.5 font-normal min-w-0">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isOpen ? null : row.player.id)}
                          aria-expanded={isOpen}
                          aria-controls={isOpen ? panelId : undefined}
                          className="flex items-center gap-2 min-w-0 w-full text-left cursor-pointer"
                        >
                          <Avatar name={row.player.name} photo={photos[row.player.id]} size={32} />
                          <span
                            className={`text-sm truncate max-w-[6.5rem] sm:max-w-none ${medal ? 'font-bold' : 'font-semibold'}`}
                            style={{ color: 'var(--kc-text)' }}
                          >
                            {row.player.name}
                          </span>
                          {hot > 0 && (
                            <span
                              className="flex items-center shrink-0 font-lexend font-bold text-[10px] tabular-nums"
                              style={{ color: 'var(--kc-accent)' }}
                              title={`${hot} wins in a row`}
                              role="img"
                              aria-label={`${hot} wins in a row`}
                            >
                              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                                local_fire_department
                              </span>
                              {hot}
                            </span>
                          )}
                          <span className="hidden md:inline-flex">
                            <SkillBadge skill={row.player.skill} />
                          </span>
                          <span
                            className="material-symbols-outlined text-[18px] ml-auto shrink-0 transition-transform"
                            style={{ color: 'var(--kc-text-muted)', transform: isOpen ? 'rotate(180deg)' : undefined }}
                            aria-hidden="true"
                          >
                            expand_more
                          </span>
                        </button>
                      </th>
                      <td className="px-2 py-2.5 text-right font-lexend font-bold text-sm tabular-nums" style={{ color: 'var(--kc-text)' }}>
                        {row.wins}–{row.losses}
                      </td>
                      <td className="px-2 py-2.5 text-right text-sm tabular-nums" style={{ color: 'var(--kc-text-dim)' }}>
                        {Math.round(row.winRate * 100)}%
                      </td>
                      {showDiff && (
                        <td
                          className="px-2 py-2.5 text-right text-sm tabular-nums"
                          style={{ color: row.pointDiff > 0 ? 'var(--kc-accent)' : 'var(--kc-text-dim)' }}
                        >
                          {formatDiff(row.pointDiff)}
                        </td>
                      )}
                      <td className="hidden sm:table-cell pl-2 pr-4 md:pr-6 py-2.5 text-right">
                        {insight && <FormDots form={insight.form} />}
                      </td>
                    </tr>
                    {isOpen && insight && (
                      <tr id={panelId} style={{ background: 'var(--kc-surface-mid)' }}>
                        <td colSpan={columnCount} className="px-4 md:px-6 pb-4 pt-1">
                          <PlayerDetails row={row} insight={insight} playerName={playerName} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
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

        <div className="space-y-2 pt-1">
          <span className="block font-lexend text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--kc-text-muted)' }}>
            Take the results with you
          </span>
          <ShareResults report={report} />
        </div>
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
                          {names(team, playerName)}
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

      {/* ===== DONE FOR THE DAY ===== */}
      <section
        aria-labelledby="wrap-up-title"
        className="rounded-[28px] p-5 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ background: 'var(--kc-surface)', border: '1px solid var(--kc-outline-dim)' }}
      >
        <div className="flex-1 min-w-0">
          <h2 id="wrap-up-title" className="font-lexend font-bold text-sm tracking-widest uppercase">
            Done for the day?
          </h2>
          <p className="mt-1 text-xs font-inter" style={{ color: 'var(--kc-text-dim)' }}>
            See the final podium, share the results, then start fresh. You can undo it afterwards.
          </p>
        </div>
        <button
          type="button"
          onClick={onWrapUp}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-lexend font-bold text-xs uppercase tracking-widest kinetic-gradient transition-all active:scale-95 cursor-pointer"
          style={{ color: 'var(--kc-on-accent)' }}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">flag</span>
          Wrap up session
        </button>
      </section>
    </div>
  );
}
