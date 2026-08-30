'use client';

import { useState } from 'react';
import { GameEvent, GameState } from '@/lib/pickleball-state';

/** Rows rendered before the "show all" affordance kicks in. */
const VISIBLE_EVENT_LIMIT = 50;

interface HistoryViewProps {
  events: GameEvent[];
  gameState: GameState;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getEventIcon(type: GameEvent['type']): string {
  switch (type) {
    case 'point':
      return 'sports_tennis';
    case 'fault':
      return 'warning';
    case 'sideout':
      return 'swap_horiz';
    case 'game':
      return 'emoji_events';
    default:
      return 'circle';
  }
}

function getEventLabel(type: GameEvent['type']): string {
  switch (type) {
    case 'point':
      return 'Point Scored';
    case 'fault':
      return 'Fault — second server';
    case 'sideout':
      return 'Side Out';
    case 'game':
      return 'Game Won';
    default:
      return 'Event';
  }
}

export function HistoryView({ events, gameState }: HistoryViewProps) {
  // Derive unique game numbers from events
  const gameNumbers = [...new Set(events.map(e => e.game ?? 1))].sort((a, b) => a - b);
  const [filterGame, setFilterGame] = useState<number | 'all'>('all');

  const filteredEvents = filterGame === 'all'
    ? events
    : events.filter(e => (e.game ?? 1) === filterGame);

  // Newest first, and capped: a five-game match can run to hundreds of events
  // and rendering all of them makes the tab janky on a phone.
  const [showAll, setShowAll] = useState(false);
  const reversedEvents = [...filteredEvents].reverse();
  const visibleEvents = showAll ? reversedEvents : reversedEvents.slice(0, VISIBLE_EVENT_LIMIT);
  const hiddenCount = reversedEvents.length - visibleEvents.length;

  // Event counts per game for the filter badges
  const eventsPerGame = gameNumbers.reduce<Record<number, number>>((acc, g) => {
    acc[g] = events.filter(e => (e.game ?? 1) === g).length;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <h3 className="font-lexend font-bold text-sm tracking-widest uppercase">
          Scoring History
        </h3>
        <div className="h-px grow" style={{ background: 'var(--kc-outline-dim)' }} />
        <span className="text-[10px]" style={{ color: 'var(--kc-text-dim)' }}>
          {filteredEvents.length} events
        </span>
      </div>

      {/* Game Filter Tabs — only show when there are multiple games */}
      {gameNumbers.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterGame('all')}
            className="px-3 py-1.5 rounded-full text-[10px] font-lexend font-bold uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
            style={{
              background: filterGame === 'all' ? 'var(--kc-accent)' : 'var(--kc-surface-highest)',
              color: filterGame === 'all' ? 'var(--kc-on-accent)' : 'var(--kc-text-dim)',
            }}
          >
            All ({events.length})
          </button>
          {gameNumbers.map(g => (
            <button
              key={g}
              onClick={() => setFilterGame(g)}
              className="px-3 py-1.5 rounded-full text-[10px] font-lexend font-bold uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
              style={{
                background: filterGame === g ? 'var(--kc-accent)' : 'var(--kc-surface-highest)',
                color: filterGame === g ? 'var(--kc-on-accent)' : 'var(--kc-text-dim)',
              }}
            >
              Game {g} ({eventsPerGame[g] ?? 0})
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div
          className="rounded-[32px] p-12 text-center"
          style={{ background: 'var(--kc-surface)' }}
        >
          <span
            className="material-symbols-outlined text-5xl mb-3"
            style={{ color: 'var(--kc-surface-bright)' }}
          >
            history
          </span>
          <h4 className="font-lexend font-bold text-lg mb-1" style={{ color: 'var(--kc-text-dim)' }}>
            No Events Yet
          </h4>
          <p className="text-sm" style={{ color: 'var(--kc-text-muted)' }}>
            Game events will appear here as the match progresses
          </p>
        </div>
      )}

      {/* Event Timeline */}
      <div className="space-y-3">
        {visibleEvents.map((event, index) => {
          const teamName = event.team === 'A' ? gameState.teams.A.name : gameState.teams.B.name;
          const isPoint = event.type === 'point';
          const isSideout = event.type === 'sideout';
          const isGameEnd = event.type === 'game';
          const gameNum = event.game ?? 1;

          return (
            <div
              key={event.id || index}
              className="rounded-2xl p-4 flex items-center justify-between animate-slide-in-right"
              style={{
                background: isGameEnd
                  ? 'var(--kc-surface-high)'
                  : isPoint
                    ? 'var(--kc-surface-mid)'
                    : 'rgba(0, 0, 0, 0.3)',
                borderLeft: `4px solid ${isGameEnd
                    ? 'var(--kc-accent)'
                    : isPoint
                      ? 'var(--kc-accent-container)'
                      : isSideout
                        ? 'var(--kc-secondary-text)'
                        : 'var(--kc-surface-highest)'
                  }`,
                animationDelay: `${Math.min(index, 12) * 0.03}s`,
              }}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--kc-surface-high)' }}
                >
                  <span
                    aria-hidden="true"
                    className={`material-symbols-outlined ${isPoint || isGameEnd ? 'filled' : ''}`}
                    style={{
                      color: isPoint || isGameEnd ? 'var(--kc-accent)' : 'var(--kc-text-dim)',
                      fontVariationSettings: isPoint || isGameEnd ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    {getEventIcon(event.type)}
                  </span>
                </div>

                {/* Event Info */}
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--kc-text)' }}>
                    {getEventLabel(event.type)} — {teamName}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--kc-text-dim)' }}>
                    {event.type === 'point'
                      ? `Server ${event.server ?? event.serverAfter.serverNumber} scored`
                      : event.type === 'sideout'
                        ? 'Serve transferred to other team'
                        : event.type === 'game'
                          ? `Closed out game ${gameNum}`
                          : `Server ${event.serverAfter.serverNumber} next`}
                  </p>
                </div>
              </div>

              {/* Score + Game Badge */}
              <div className="text-right flex items-center gap-3">
                {/* Game badge */}
                {gameNumbers.length > 1 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                    style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text-dim)' }}
                  >
                    G{gameNum}
                  </span>
                )}
                <div>
                  {/* Score call in X-Y-Z format */}
                  <p className="text-lg font-lexend font-black tracking-tighter" style={{ color: 'var(--kc-text)' }}>
                    {event.score || `${String(event.scoreAfter.A).padStart(2, '0')}-${String(event.scoreAfter.B).padStart(2, '0')}`}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--kc-text-dim)' }}>
                    {formatTime(event.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 rounded-2xl font-lexend text-[10px] font-bold uppercase tracking-widest transition-all active:scale-[0.99] cursor-pointer"
          style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text-dim)' }}
        >
          Show {hiddenCount} earlier {hiddenCount === 1 ? 'event' : 'events'}
        </button>
      )}
    </div>
  );
}
