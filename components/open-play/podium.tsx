import type { Standing } from '@/lib/open-play';
import type { PhotoMap } from '@/hooks/useOpenPlay';
import { Avatar, medalColor, tint } from './shared';

type Place = 1 | 2 | 3;

const ORDINAL: Record<Place, string> = { 1: '1st', 2: '2nd', 3: '3rd' };

/** Avatar diameters and pedestal heights in px. First place stands tallest. */
const SIZES = {
  full: { avatar: { 1: 68, 2: 54, 3: 54 }, pedestal: { 1: 92, 2: 68, 3: 52 } },
  compact: { avatar: { 1: 48, 2: 40, 3: 40 }, pedestal: { 1: 52, 2: 40, 3: 30 } },
} as const;

/** Players level on every tiebreaker share a place; this many are drawn before "+N". */
const MAX_TIED_SHOWN = 3;

interface PodiumProps {
  standings: Standing[];
  photos: PhotoMap;
  /** A smaller podium, for dialogs. */
  compact?: boolean;
}

/**
 * The top three as a podium: second, first, third, left to right. Ranks are
 * shared on a tie, so a tie for first puts both players on the top step and
 * leaves no second place — the same numbers the table below shows.
 */
export function Podium({ standings, photos, compact = false }: PodiumProps) {
  const sizes = SIZES[compact ? 'compact' : 'full'];
  const steps = ([2, 1, 3] as const)
    .map(place => ({ place, rows: standings.filter(row => row.rank === place) }))
    .filter(step => step.rows.length > 0);
  if (steps.length === 0) return null;

  return (
    <ol
      aria-label="Top three"
      className="grid items-end gap-2 sm:gap-3 mx-auto w-full max-w-md"
      // A step holding tied players is as wide as they are, so they stand side by side.
      style={{
        gridTemplateColumns: steps.map(({ rows }) => `minmax(0, ${Math.min(rows.length, MAX_TIED_SHOWN)}fr)`).join(' '),
      }}
    >
      {steps.map(({ place, rows }) => {
        const color = medalColor(place) ?? 'var(--kc-text-dim)';
        const shown = rows.slice(0, MAX_TIED_SHOWN);
        const hidden = rows.length - shown.length;
        const avatar = sizes.avatar[place];

        return (
          <li key={place} className="flex flex-col items-center min-w-0">
            <span className="sr-only">{ORDINAL[place]} place</span>

            <div className="flex items-end justify-center gap-2 mb-2 w-full">
              {shown.map(row => (
                <div key={row.player.id} className="flex flex-1 flex-col items-center gap-1 min-w-0">
                  {place === 1 && (
                    <span
                      className="material-symbols-outlined leading-none"
                      style={{
                        color,
                        fontSize: compact ? 20 : 26,
                        fontVariationSettings: "'FILL' 1",
                        filter: `drop-shadow(0 0 8px ${tint(color, 55)})`,
                      }}
                      aria-hidden="true"
                    >
                      emoji_events
                    </span>
                  )}
                  <span
                    className="rounded-full"
                    style={{ boxShadow: `0 0 0 2px ${color}, 0 0 ${place === 1 ? 22 : 12}px ${tint(color, 40)}` }}
                  >
                    <Avatar name={row.player.name} photo={photos[row.player.id]} size={avatar} />
                  </span>
                  <span
                    className={`font-lexend font-bold truncate max-w-full ${compact ? 'text-[11px]' : 'text-xs sm:text-sm'}`}
                    style={{ color: 'var(--kc-text)' }}
                  >
                    {row.player.name}
                  </span>
                  <span className="font-lexend font-bold text-[11px] tabular-nums" style={{ color }}>
                    {row.wins}–{row.losses}
                    {!compact && (
                      <span className="font-medium" style={{ color: 'var(--kc-text-dim)' }}>
                        {' · '}
                        {Math.round(row.winRate * 100)}%
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {hidden > 0 && (
              <span className="mb-2 text-[10px] font-inter" style={{ color: 'var(--kc-text-muted)' }}>
                +{hidden} more
              </span>
            )}

            <div
              aria-hidden="true"
              className="w-full rounded-t-2xl flex items-start justify-center pt-1.5 font-lexend font-black"
              style={{
                height: sizes.pedestal[place],
                fontSize: place === 1 ? (compact ? 20 : 30) : compact ? 16 : 22,
                color,
                borderTop: `2px solid ${color}`,
                background: `linear-gradient(to bottom, ${tint(color, 26)}, ${tint(color, 5)})`,
              }}
            >
              {place}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
