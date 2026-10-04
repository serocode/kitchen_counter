'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MAX_NAME_LENGTH, OpenPlayer, PlayerDetails } from '@/lib/open-play';
import { Avatar, PhotoButton, SkillPicker, TextAction, dialogContentStyle, inputStyle } from './shared';

interface EditPlayerDialogProps {
  /** The player being edited; null closes the dialog. */
  player: OpenPlayer | null;
  photo: string | undefined;
  /** On a court right now — they can't be removed until the game is recorded. */
  onCourt: boolean;
  /** Lower-cased names already on the roster, to catch duplicates. */
  takenNames: Set<string>;
  /** Everyone else on the roster — the candidates for a locked partner. */
  others: OpenPlayer[];
  onOpenChange: (open: boolean) => void;
  /**
   * `photo` is the new photo, null to remove it, or undefined when unchanged.
   * `partnerId` is the chosen locked partner, null for none.
   */
  onSave: (changes: PlayerDetails, photo: string | null | undefined, partnerId: string | null) => void;
  onRemove: () => void;
}

const photoActionClass =
  'flex items-center gap-1.5 px-3 py-2 rounded-full font-inter text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50';

export function EditPlayerDialog({
  player,
  photo,
  onCourt,
  takenNames,
  others,
  onOpenChange,
  onSave,
  onRemove,
}: EditPlayerDialogProps) {
  const [name, setName] = useState('');
  const [skill, setSkill] = useState(3);
  const [draftPhoto, setDraftPhoto] = useState<string | null>(null);
  /** The chosen locked partner's id; empty for none, which a <select> needs. */
  const [partnerId, setPartnerId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Re-seed only when a different player is opened — a queue change behind
  // the dialog hands us a new object for the same player mid-edit.
  const playerId = player?.id ?? null;
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (playerId !== seededFor) {
    setSeededFor(playerId);
    if (player) {
      setName(player.name);
      setSkill(player.skill);
      setDraftPhoto(photo ?? null);
      setPartnerId(player.partnerId ?? '');
      setError(null);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('A player needs a name.');
      return;
    }
    const lower = trimmed.toLowerCase();
    if (lower !== player.name.toLowerCase() && takenNames.has(lower)) {
      setError(`${trimmed} is already on the roster.`);
      return;
    }
    onSave({ name: trimmed, skill }, draftPhoto === (photo ?? null) ? undefined : draftPhoto, partnerId || null);
    onOpenChange(false);
  };

  // Choosing someone who is already locked with a third player breaks that
  // lock, so say so before it happens rather than after.
  const chosen = others.find(o => o.id === partnerId);
  const stolenFrom =
    chosen?.partnerId && chosen.partnerId !== player?.id
      ? others.find(o => o.id === chosen.partnerId)
      : undefined;

  return (
    <Dialog open={Boolean(player)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" style={dialogContentStyle}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-lexend font-bold text-xl uppercase tracking-widest" style={{ color: 'var(--kc-text)' }}>
              Edit player
            </DialogTitle>
            <DialogDescription className="text-sm" style={{ color: 'var(--kc-text-dim)' }}>
              A new rating applies to the next match drawn, not one already on court.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <Avatar name={name || player?.name || ''} photo={draftPhoto ?? undefined} size={88} />
              <div className="flex flex-wrap gap-2">
                <PhotoButton
                  label={draftPhoto ? 'Retake photo' : 'Take photo'}
                  onPhoto={setDraftPhoto}
                  onError={setError}
                  className={photoActionClass}
                  style={{ background: 'var(--kc-accent)', color: 'var(--kc-on-accent)' }}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">photo_camera</span>
                  {draftPhoto ? 'Retake' : 'Take photo'}
                </PhotoButton>
                <PhotoButton
                  label="Choose a photo from the library"
                  source="library"
                  onPhoto={setDraftPhoto}
                  onError={setError}
                  className={photoActionClass}
                  style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text)' }}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">photo_library</span>
                  Upload
                </PhotoButton>
                {draftPhoto && (
                  <button
                    type="button"
                    onClick={() => setDraftPhoto(null)}
                    className={photoActionClass}
                    style={{ background: 'transparent', color: 'var(--kc-error)' }}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">no_photography</span>
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-player-name"
                className="block text-[10px] font-inter font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--kc-text-dim)' }}
              >
                Name
              </label>
              <input
                id="edit-player-name"
                value={name}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="off"
                onChange={e => {
                  setName(e.target.value);
                  setError(null);
                }}
                onFocus={e => e.target.select()}
                style={inputStyle}
              />
            </div>
            <SkillPicker name="edit-player-skill" value={skill} onChange={setSkill} />

            <div>
              <label
                htmlFor="edit-player-partner"
                className="block text-[10px] font-inter font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--kc-text-dim)' }}
              >
                Locked partner
              </label>
              <select
                id="edit-player-partner"
                value={partnerId}
                onChange={e => setPartnerId(e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              >
                <option value="">No one — plays with anyone</option>
                {[...others]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(other => (
                    <option key={other.id} value={other.id}>
                      {other.name}
                    </option>
                  ))}
              </select>
              <p className="mt-2 text-xs font-inter" style={{ color: 'var(--kc-text-muted)' }}>
                {stolenFrom
                  ? `${chosen?.name} is locked with ${stolenFrom.name} — choosing them unlocks that pair.`
                  : 'Locked partners always play on the same team, and take the place of whichever of them has waited longer. While one sits out, the other plays with anyone.'}
              </p>
            </div>
            {error && (
              <p role="alert" className="text-sm font-inter" style={{ color: 'var(--kc-error)' }}>
                {error}
              </p>
            )}

            <div
              className="pt-3 flex flex-wrap items-center gap-x-3 gap-y-1"
              style={{ borderTop: '1px solid var(--kc-outline-dim)' }}
            >
              <TextAction
                icon="person_remove"
                danger
                disabled={onCourt}
                onClick={() => {
                  onRemove();
                  onOpenChange(false);
                }}
              >
                Remove from roster
              </TextAction>
              {onCourt && (
                <span className="text-xs font-inter" style={{ color: 'var(--kc-text-muted)' }}>
                  Record their game first.
                </span>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-6 py-3 rounded-full font-inter font-semibold text-sm transition-all active:scale-95 cursor-pointer"
              style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text-dim)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-full font-lexend font-bold text-sm uppercase tracking-widest kinetic-gradient transition-all active:scale-95 cursor-pointer"
              style={{ color: 'var(--kc-on-accent)' }}
            >
              Save
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
