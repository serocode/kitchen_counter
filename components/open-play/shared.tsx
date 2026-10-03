'use client';

import { useRef, useState } from 'react';
import { SKILL_LEVELS, formatSkill, skillTier } from '@/lib/open-play';
import { AVATAR_PHOTO, readPhoto } from '@/lib/photo';

export const TEAM_COLORS = ['var(--kc-team-a)', 'var(--kc-team-b)'] as const;

/** A player as the views draw them: the name, and a rating if still on the roster. */
export interface PlayerChip {
  id: string;
  name: string;
  skill: number | null;
  photo?: string;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * A round face, or initials until a photo is taken. Decorative: the name is
 * always printed beside it, so screen readers would only hear it twice.
 */
export function Avatar({ name, photo, size }: { name: string; photo?: string; size: number }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size, background: 'var(--kc-surface-highest)' }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="rounded-full shrink-0 flex items-center justify-center font-lexend font-bold"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.round(size * 0.32)),
        background: 'var(--kc-surface-highest)',
        color: 'var(--kc-text-dim)',
      }}
    >
      {initials(name)}
    </span>
  );
}

/**
 * A button that takes a photo. On a phone, `camera` opens the front camera
 * straight away for a selfie; `library` opens the photo picker. Desktop
 * browsers ignore the camera hint and show a file picker either way.
 */
export function PhotoButton({
  label,
  source = 'camera',
  onPhoto,
  onError,
  className,
  style,
  children,
}: {
  label: string;
  source?: 'camera' | 'library';
  onPhoto: (photo: string) => void;
  onError: (message: string) => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear it so the same file can be picked again after a removal.
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      onPhoto(await readPhoto(file, AVATAR_PHOTO));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not use that photo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-busy={busy}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={className}
        style={style}
      >
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={source === 'camera' ? 'user' : undefined}
        onChange={handleChange}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );
}

export function SkillBadge({ skill }: { skill: number }) {
  return (
    <span
      className="inline-flex items-center justify-center min-w-[2.25rem] px-1.5 py-0.5 rounded-md font-lexend font-bold text-[10px] tabular-nums shrink-0"
      style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text-dim)' }}
      title={`${skillTier(skill)} · ${formatSkill(skill)}`}
    >
      {formatSkill(skill)}
    </span>
  );
}

/** One radio per skill step: arrow keys move between them like any radio group. */
export function SkillPicker({
  value,
  onChange,
  name,
  label = 'Skill level',
}: {
  value: number;
  onChange: (skill: number) => void;
  name: string;
  label?: string;
}) {
  return (
    <fieldset>
      <legend
        className="block text-[10px] font-inter font-bold uppercase tracking-widest mb-2"
        style={{ color: 'var(--kc-text-dim)' }}
      >
        {label} <span style={{ color: 'var(--kc-text-muted)' }}>· {skillTier(value)}</span>
      </legend>
      <div className="grid grid-cols-7 gap-1.5">
        {SKILL_LEVELS.map(level => {
          const checked = value === level;
          return (
            <label key={level} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={level}
                checked={checked}
                onChange={() => onChange(level)}
                className="peer sr-only"
              />
              <span
                className="flex items-center justify-center h-10 rounded-xl font-lexend font-bold text-[11px] tabular-nums transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--kc-accent)]"
                style={{
                  background: checked ? 'var(--kc-accent)' : 'var(--kc-surface-highest)',
                  color: checked ? 'var(--kc-on-accent)' : 'var(--kc-text)',
                }}
              >
                {formatSkill(level)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SectionHeading({
  title,
  id,
  aside,
}: {
  title: string;
  id?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <h2 id={id} className="font-lexend font-bold text-sm tracking-widest uppercase shrink-0">
        {title}
      </h2>
      <div className="h-px grow" style={{ background: 'var(--kc-outline-dim)' }} />
      {aside}
    </div>
  );
}

/** One side of a matchup: a colored edge, the team label and both players. */
export function TeamBlock({
  side,
  players,
  highlight = false,
}: {
  side: 0 | 1;
  players: PlayerChip[];
  highlight?: boolean;
}) {
  const color = TEAM_COLORS[side];
  const total = players.reduce((sum, p) => sum + (p.skill ?? 0), 0);
  const allRated = players.every(p => p.skill !== null);

  return (
    <div
      className="rounded-2xl p-3 flex flex-col gap-2 min-w-0"
      style={{
        background: highlight ? 'var(--kc-surface-highest)' : 'var(--kc-surface-high)',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <span
        className="font-lexend text-[9px] uppercase tracking-widest font-bold flex items-center justify-between gap-2"
        style={{ color }}
      >
        Team {side + 1}
        {allRated && (
          <span className="tabular-nums" style={{ color: 'var(--kc-text-muted)' }} title="Combined rating">
            Σ {total.toFixed(1)}
          </span>
        )}
      </span>
      {players.map(player => (
        <div key={player.id} className="flex items-center gap-2 min-w-0">
          <Avatar name={player.name} photo={player.photo} size={32} />
          <div className="min-w-0">
            <div className="font-lexend font-bold text-sm truncate" style={{ color: 'var(--kc-text)' }}>
              {player.name}
            </div>
            {player.skill !== null && (
              <div
                className="font-lexend font-bold text-[10px] tabular-nums leading-tight"
                style={{ color: 'var(--kc-text-muted)' }}
                title={skillTier(player.skill)}
              >
                {formatSkill(player.skill)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A quiet text-and-icon button for secondary actions on a card. */
export function TextAction({
  icon,
  children,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: string;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 px-2 py-1.5 rounded-full font-inter text-xs font-semibold transition-colors cursor-pointer hover:bg-[var(--kc-surface-highest)] disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color: danger ? 'var(--kc-error)' : 'var(--kc-text-dim)' }}
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        {icon}
      </span>
      {children}
    </button>
  );
}

/** A round icon-only button. The label is required: it is the accessible name. */
export function IconButton({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
  title,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-[var(--kc-surface-highest)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      style={{ color: danger ? 'var(--kc-error)' : 'var(--kc-text-dim)' }}
    >
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[32px] p-10 text-center" style={{ background: 'var(--kc-surface)' }}>
      <span
        className="material-symbols-outlined text-5xl mb-3"
        style={{ color: 'var(--kc-surface-bright)' }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <h3 className="font-lexend font-bold text-lg mb-1" style={{ color: 'var(--kc-text-dim)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export const dialogContentStyle: React.CSSProperties = {
  background: 'var(--kc-surface-mid)',
  border: '1px solid var(--kc-outline)',
  borderRadius: '32px',
};

/**
 * 16px text stops iOS zooming the page on focus. No `outline: none` — the
 * global :focus-visible ring is how keyboard users find the field.
 */
export const inputStyle: React.CSSProperties = {
  background: 'var(--kc-surface-highest)',
  color: 'var(--kc-text)',
  border: 'none',
  borderRadius: '12px',
  padding: '12px 16px',
  width: '100%',
  fontSize: '16px',
  fontFamily: 'Inter, sans-serif',
};
