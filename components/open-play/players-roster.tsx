'use client';

import { useRef, useState } from 'react';
import {
  DEFAULT_SKILL,
  MAX_NAME_LENGTH,
  NewPlayer,
  OpenPlaySession,
  OpenPlayer,
  PlayerRecord,
  PlayerStatus,
  getRecord,
  safeSkill,
} from '@/lib/open-play';
import type { NewPlayerWithPhoto, PhotoMap } from '@/hooks/useOpenPlay';
import { Avatar, IconButton, PhotoButton, SectionHeading, SkillBadge, SkillPicker, inputStyle } from './shared';

interface PlayersRosterProps {
  session: OpenPlaySession;
  statuses: Map<string, PlayerStatus>;
  records: Map<string, PlayerRecord>;
  photos: PhotoMap;
  onAdd: (players: NewPlayerWithPhoto[]) => void;
  onSetPhoto: (id: string, photo: string) => void;
  onSetActive: (id: string, active: boolean) => void;
  onEdit: (id: string) => void;
}

/**
 * One player per line, with an optional rating at the end:
 * "Jordan", "Jordan 3.5", "Jordan, 4.0" and "1. Jordan - 3.5" all work.
 * The rating needs its decimal, so "Sam 2" stays a name rather than a 2.0.
 */
function parseList(text: string, fallbackSkill: number): NewPlayer[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim().replace(/^(\d+[.)]\s+|[-*•]\s+)/, '').trim())
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^(.*?)[\s,;:|–—-]+(\d\.\d+)\+?$/);
      if (match && match[1].trim()) {
        const rating = Number(match[2]);
        if (rating >= 1 && rating <= 6) return { name: match[1].trim(), skill: safeSkill(rating) };
      }
      return { name: line, skill: fallbackSkill };
    });
}

function statusLabel(status: PlayerStatus | undefined): { text: string; color: string } {
  if (!status || status.kind === 'out') return { text: 'Sitting out', color: 'var(--kc-text-muted)' };
  if (status.kind === 'court') return { text: `On ${status.courtName}`, color: 'var(--kc-accent)' };
  if (status.upNext) return { text: 'Up next', color: 'var(--kc-accent)' };
  return { text: `#${status.position} in line`, color: 'var(--kc-text-dim)' };
}

/** The small camera badge that says "tap the face to take a photo". */
function CameraBadge() {
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
      style={{ background: 'var(--kc-accent)', color: 'var(--kc-on-accent)', boxShadow: '0 0 0 2px var(--kc-surface-mid)' }}
      aria-hidden="true"
    >
      <span className="material-symbols-outlined text-[13px]">photo_camera</span>
    </span>
  );
}

export function PlayersRoster({
  session,
  statuses,
  records,
  photos,
  onAdd,
  onSetPhoto,
  onSetActive,
  onEdit,
}: PlayersRosterProps) {
  const [name, setName] = useState('');
  const [skill, setSkill] = useState(DEFAULT_SKILL);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const takenNames = new Set(session.players.map(p => p.name.toLowerCase()));
  const findByName = (value: string) => session.players.find(p => p.name.toLowerCase() === value.toLowerCase());

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage({ text: 'Enter a name first.', error: true });
      return;
    }
    const existing = findByName(trimmed);
    if (existing) {
      setMessage({ text: `${existing.name} is already on the roster.`, error: true });
      return;
    }
    onAdd([{ name: trimmed, skill, photo: newPhoto ?? undefined }]);
    setMessage({ text: `Checked in ${trimmed}.`, error: false });
    setName('');
    setNewPhoto(null);
    // Keep the rating: groups usually check in a run of similar players.
    nameRef.current?.focus();
  };

  const handleBulkAdd = () => {
    const seen = new Set(takenNames);
    const fresh: NewPlayer[] = [];
    let skipped = 0;
    for (const entry of parseList(bulkText, skill)) {
      const key = entry.name.slice(0, MAX_NAME_LENGTH).toLowerCase();
      if (seen.has(key)) {
        skipped++;
        continue;
      }
      seen.add(key);
      fresh.push(entry);
    }
    if (fresh.length === 0) {
      setMessage({
        text: skipped > 0 ? 'Everyone in that list is already on the roster.' : 'Paste at least one name.',
        error: true,
      });
      return;
    }
    onAdd(fresh);
    setBulkText('');
    setBulkOpen(false);
    setMessage({
      text:
        `Checked in ${fresh.length} ${fresh.length === 1 ? 'player' : 'players'}.` +
        (skipped > 0 ? ` Skipped ${skipped} already on the roster.` : ''),
      error: false,
    });
  };

  const byName = (a: OpenPlayer, b: OpenPlayer) => a.name.localeCompare(b.name);
  const checkedIn = session.players.filter(p => p.active).sort(byName);
  const sittingOut = session.players.filter(p => !p.active).sort(byName);

  const showError = (text: string) => setMessage({ text, error: true });

  const renderRow = (player: OpenPlayer) => {
    const status = statuses.get(player.id);
    const onCourt = status?.kind === 'court';
    const { games, wins, losses } = getRecord(records, player.id);
    const label = statusLabel(status);
    const photo = photos[player.id];

    return (
      <li
        key={player.id}
        className="flex items-center gap-3 rounded-2xl pl-3 pr-1.5 py-2.5"
        style={{ background: 'var(--kc-surface-mid)', opacity: player.active ? 1 : 0.7 }}
      >
        <PhotoButton
          label={photo ? `Retake ${player.name}'s photo` : `Take a photo of ${player.name}`}
          onPhoto={taken => onSetPhoto(player.id, taken)}
          onError={showError}
          className="relative shrink-0 rounded-full cursor-pointer transition-transform active:scale-90 disabled:opacity-50"
        >
          <Avatar name={player.name} photo={photo} size={44} />
          {!photo && <CameraBadge />}
        </PhotoButton>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--kc-text)' }}>
              {player.name}
            </span>
            <SkillBadge skill={player.skill} />
          </div>
          <p className="text-[11px] font-inter truncate">
            <span style={{ color: label.color }}>{label.text}</span>
            <span style={{ color: 'var(--kc-text-muted)' }}>
              {' · '}
              {games} {games === 1 ? 'game' : 'games'}
              {games > 0 && ` · ${wins}–${losses}`}
            </span>
          </p>
        </div>
        <IconButton
          icon={player.active ? 'pause_circle' : 'play_circle'}
          label={player.active ? `Sit out ${player.name}` : `Check ${player.name} back in`}
          title={onCourt ? 'Finish their game first' : undefined}
          disabled={onCourt}
          onClick={() => onSetActive(player.id, !player.active)}
        />
        <IconButton icon="edit" label={`Edit ${player.name}`} onClick={() => onEdit(player.id)} />
      </li>
    );
  };

  return (
    <div className="space-y-8">
      {/* ===== CHECK IN ===== */}
      <section
        aria-labelledby="add-players-title"
        className="rounded-[28px] p-4 md:p-6 space-y-5"
        style={{ background: 'var(--kc-surface)' }}
      >
        <SectionHeading id="add-players-title" title="Check in players" />

        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label
              htmlFor="new-player-name"
              className="block text-[10px] font-inter font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--kc-text-dim)' }}
            >
              Name
            </label>
            <div className="flex gap-2">
              <div className="relative shrink-0">
                <PhotoButton
                  label={newPhoto ? 'Retake photo' : 'Take a photo'}
                  onPhoto={setNewPhoto}
                  onError={showError}
                  className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
                  style={{
                    background: 'var(--kc-surface-highest)',
                    color: 'var(--kc-text-dim)',
                    border: newPhoto ? 'none' : '1px dashed var(--kc-outline)',
                  }}
                >
                  {newPhoto ? (
                    <img src={newPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined" aria-hidden="true">photo_camera</span>
                  )}
                </PhotoButton>
                {newPhoto && (
                  <button
                    type="button"
                    onClick={() => setNewPhoto(null)}
                    aria-label="Remove photo"
                    title="Remove photo"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: 'var(--kc-bg)', color: 'var(--kc-error)', boxShadow: '0 0 0 1px var(--kc-outline)' }}
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
                  </button>
                )}
              </div>
              <input
                id="new-player-name"
                ref={nameRef}
                value={name}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="off"
                onChange={e => {
                  setName(e.target.value);
                  if (message?.error) setMessage(null);
                }}
                placeholder="Player name"
                style={inputStyle}
              />
              <button
                type="submit"
                className="shrink-0 px-5 rounded-xl font-lexend font-bold text-xs uppercase tracking-widest kinetic-gradient transition-all active:scale-95 cursor-pointer"
                style={{ color: 'var(--kc-on-accent)' }}
              >
                Add
              </button>
            </div>
          </div>
          <SkillPicker name="new-player-skill" value={skill} onChange={setSkill} />
          <p className="text-xs font-inter" style={{ color: 'var(--kc-text-muted)' }}>
            Tap <span className="material-symbols-outlined align-middle text-[16px]" aria-label="the camera">photo_camera</span>{' '}
            for a selfie, here or on anyone below. Photos stay on this device.
          </p>
        </form>

        {message && (
          <p
            role={message.error ? 'alert' : 'status'}
            className="text-sm font-inter"
            style={{ color: message.error ? 'var(--kc-error)' : 'var(--kc-text-dim)' }}
          >
            {message.text}
          </p>
        )}

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setBulkOpen(v => !v)}
            aria-expanded={bulkOpen}
            aria-controls="bulk-add"
            className="flex items-center gap-1.5 text-xs font-inter font-semibold cursor-pointer"
            style={{ color: 'var(--kc-text-dim)' }}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {bulkOpen ? 'expand_less' : 'playlist_add'}
            </span>
            {bulkOpen ? 'Hide list' : 'Paste a list of players'}
          </button>

          {bulkOpen && (
            <div id="bulk-add" className="mt-3 space-y-3 animate-fade-in">
              <label htmlFor="bulk-players" className="block text-xs font-inter" style={{ color: 'var(--kc-text-dim)' }}>
                One player per line. Add a rating after the name — <code>Jordan 3.5</code> — or leave it off
                to use the level selected above.
              </label>
              <textarea
                id="bulk-players"
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                rows={6}
                placeholder={'Alex 3.5\nSam, 4.0\nJordan'}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <button
                type="button"
                onClick={handleBulkAdd}
                className="px-5 py-3 rounded-full font-lexend font-bold text-xs uppercase tracking-widest kinetic-gradient transition-all active:scale-95 cursor-pointer"
                style={{ color: 'var(--kc-on-accent)' }}
              >
                Check in everyone
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ===== ROSTER ===== */}
      <section aria-labelledby="roster-title" className="space-y-4">
        <SectionHeading
          id="roster-title"
          title="Checked in"
          aside={
            <span className="text-[10px] shrink-0" style={{ color: 'var(--kc-text-dim)' }}>
              {checkedIn.length}
            </span>
          }
        />
        {checkedIn.length === 0 ? (
          <p className="text-sm font-inter" style={{ color: 'var(--kc-text-muted)' }}>
            Nobody is checked in yet.
          </p>
        ) : (
          <ul className="space-y-2">{checkedIn.map(renderRow)}</ul>
        )}
      </section>

      {sittingOut.length > 0 && (
        <section aria-labelledby="sitting-out-title" className="space-y-4">
          <SectionHeading
            id="sitting-out-title"
            title="Sitting out"
            aside={
              <span className="text-[10px] shrink-0" style={{ color: 'var(--kc-text-dim)' }}>
                {sittingOut.length}
              </span>
            }
          />
          <ul className="space-y-2">{sittingOut.map(renderRow)}</ul>
        </section>
      )}
    </div>
  );
}
