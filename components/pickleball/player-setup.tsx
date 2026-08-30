'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Player, MatchMode, MATCH_MODES } from '@/lib/pickleball-state';

interface PlayerSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamAName: string;
  teamBName: string;
  teamAPlayers: [Player, Player];
  teamBPlayers: [Player, Player];
  currentMatchMode: MatchMode;
  /** True once points have been scored — changing mode then is disruptive. */
  isMatchStarted: boolean;
  onSave: (
    teamAName: string,
    teamBName: string,
    teamAPlayers: [Player, Player],
    teamBPlayers: [Player, Player],
    matchMode: MatchMode
  ) => void;
}

type FormData = {
  teamAName: string;
  teamBName: string;
  teamA1Name: string;
  teamA2Name: string;
  teamB1Name: string;
  teamB2Name: string;
  teamA1Photo: string;
  teamA2Photo: string;
  teamB1Photo: string;
  teamB2Photo: string;
  matchMode: MatchMode;
};

const MAX_NAME_LENGTH = 24;
const MAX_IMAGE_DIMENSION = 500;

function buildFormData(props: PlayerSetupProps): FormData {
  return {
    teamAName: props.teamAName,
    teamBName: props.teamBName,
    teamA1Name: props.teamAPlayers[0].name,
    teamA2Name: props.teamAPlayers[1].name,
    teamB1Name: props.teamBPlayers[0].name,
    teamB2Name: props.teamBPlayers[1].name,
    teamA1Photo: props.teamAPlayers[0].photo || '',
    teamA2Photo: props.teamAPlayers[1].photo || '',
    teamB1Photo: props.teamBPlayers[0].photo || '',
    teamB2Photo: props.teamBPlayers[1].photo || '',
    matchMode: props.currentMatchMode,
  };
}

export function PlayerSetupModal(props: PlayerSetupProps) {
  const { open, onOpenChange, isMatchStarted, onSave } = props;

  const [formData, setFormData] = useState<FormData>(() => buildFormData(props));
  const [uploadError, setUploadError] = useState<string | null>(null);

  // The dialog stays mounted, so without this the form would still show the
  // values captured on first render after a reset or an external edit.
  useEffect(() => {
    if (open) {
      setFormData(buildFormData(props));
      setUploadError(null);
    }
    // Re-seeding is intentionally keyed on `open` alone — editing a field
    // must not be clobbered by an unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setField = (field: keyof FormData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof FormData) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('That file is not an image.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setUploadError('Could not read that file.');
    reader.onloadend = () => {
      const img = new Image();
      img.onerror = () => setUploadError('Could not decode that image.');
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setUploadError('Could not process that image.');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        setUploadError(null);
        setField(field, canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    // Allow re-picking the same file after a removal.
    input.value = '';
  };

  const handleSave = () => {
    // Empty names would render as blank cards on the scoreboard.
    const named = (value: string, fallback: string) => value.trim() || fallback;

    onSave(
      named(formData.teamAName, 'Team A'),
      named(formData.teamBName, 'Team B'),
      [
        { name: named(formData.teamA1Name, 'Player 1'), photo: formData.teamA1Photo || undefined },
        { name: named(formData.teamA2Name, 'Player 2'), photo: formData.teamA2Photo || undefined },
      ],
      [
        { name: named(formData.teamB1Name, 'Player 1'), photo: formData.teamB1Photo || undefined },
        { name: named(formData.teamB2Name, 'Player 2'), photo: formData.teamB2Photo || undefined },
      ],
      formData.matchMode,
    );
    onOpenChange(false);
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--kc-surface-highest)',
    color: 'var(--kc-text)',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 16px',
    width: '100%',
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
  };

  const teams = [
    {
      label: 'TEAM 1',
      nameField: 'teamAName' as const,
      accentColor: 'var(--kc-team-a)',
      players: [
        { key: 'teamA1', label: 'Player 1 (Left)', nameField: 'teamA1Name' as const, photoField: 'teamA1Photo' as const },
        { key: 'teamA2', label: 'Player 2 (Right)', nameField: 'teamA2Name' as const, photoField: 'teamA2Photo' as const },
      ],
    },
    {
      label: 'TEAM 2',
      nameField: 'teamBName' as const,
      accentColor: 'var(--kc-team-b)',
      players: [
        { key: 'teamB1', label: 'Player 1 (Left)', nameField: 'teamB1Name' as const, photoField: 'teamB1Photo' as const },
        { key: 'teamB2', label: 'Player 2 (Right)', nameField: 'teamB2Name' as const, photoField: 'teamB2Photo' as const },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--kc-surface-mid)', border: 'none', borderRadius: '32px' }}
      >
        <DialogHeader>
          <DialogTitle
            className="font-lexend font-bold text-xl uppercase tracking-widest"
            style={{ color: 'var(--kc-text)' }}
          >
            Match Setup
          </DialogTitle>
          <DialogDescription className="text-sm" style={{ color: 'var(--kc-text-dim)' }}>
            Configure team names, player names, and photos for this match.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 mt-4">
          {/* Match Mode Selector */}
          <div className="space-y-3">
            <span
              className="font-lexend text-[10px] uppercase tracking-widest font-bold"
              style={{ color: 'var(--kc-text-dim)' }}
            >
              Match Format
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(Object.keys(MATCH_MODES) as MatchMode[]).map(mode => {
                const isSelected = formData.matchMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setField('matchMode', mode)}
                    className={`p-4 rounded-xl text-left transition-all border-2 cursor-pointer ${
                      isSelected
                        ? 'border-kc-accent bg-kc-surface-high'
                        : 'border-transparent bg-kc-surface-high opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className={`font-lexend font-bold text-sm ${isSelected ? 'text-kc-accent' : 'text-kc-text'}`}>
                      {MATCH_MODES[mode].label}
                    </div>
                    <div className="font-inter text-xs mt-1 text-kc-text-dim">
                      {MATCH_MODES[mode].description}
                    </div>
                  </button>
                );
              })}
            </div>
            {isMatchStarted && formData.matchMode !== props.currentMatchMode && (
              <p className="text-xs font-inter" style={{ color: 'var(--kc-error)' }}>
                Changing the format mid-match keeps the games already won and
                re-checks whether the match is decided.
              </p>
            )}
          </div>

          {teams.map(team => (
            <div key={team.label} className="space-y-4">
              <span
                className="font-lexend text-[10px] uppercase tracking-widest font-bold"
                style={{ color: team.accentColor }}
              >
                {team.label}
              </span>

              <div>
                <label
                  htmlFor={team.nameField}
                  className="block text-[10px] font-inter font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--kc-text-dim)' }}
                >
                  Team Name
                </label>
                <input
                  id={team.nameField}
                  value={formData[team.nameField]}
                  maxLength={MAX_NAME_LENGTH}
                  onChange={e => setField(team.nameField, e.target.value)}
                  onFocus={e => e.target.select()}
                  placeholder="Enter team name"
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {team.players.map(({ key, label, nameField, photoField }) => {
                  const photo = formData[photoField];
                  return (
                    <div key={key} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--kc-surface-high)' }}>
                      <label
                        htmlFor={nameField}
                        className="block text-[10px] font-inter font-bold uppercase tracking-widest"
                        style={{ color: 'var(--kc-text-dim)' }}
                      >
                        {label}
                      </label>
                      <input
                        id={nameField}
                        value={formData[nameField]}
                        maxLength={MAX_NAME_LENGTH}
                        onChange={e => setField(nameField, e.target.value)}
                        onFocus={e => e.target.select()}
                        placeholder="Player name"
                        style={inputStyle}
                      />

                      <div className="space-y-2">
                        <span
                          className="block text-[10px] font-inter uppercase tracking-widest"
                          style={{ color: 'var(--kc-text-muted)' }}
                        >
                          Photo
                        </span>
                        {photo && (
                          <div className="relative">
                            <img src={photo} alt="" className="w-full h-32 object-cover rounded-xl" />
                            <button
                              type="button"
                              onClick={() => setField(photoField, '')}
                              aria-label={`Remove photo for ${label}`}
                              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                              style={{ background: 'rgba(0,0,0,0.65)', color: 'var(--kc-error)' }}
                            >
                              <span className="material-symbols-outlined text-base" aria-hidden="true">delete</span>
                            </button>
                          </div>
                        )}
                        <label
                          className="flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer transition-colors"
                          style={{
                            background: 'var(--kc-surface-highest)',
                            color: 'var(--kc-text-dim)',
                            border: '1px dashed var(--kc-outline)',
                          }}
                        >
                          <span className="material-symbols-outlined text-sm" aria-hidden="true">add_photo_alternate</span>
                          <span className="text-xs font-inter">{photo ? 'Replace Photo' : 'Upload Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handleImageUpload(e, photoField)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {uploadError && (
            <p className="text-sm font-inter" role="alert" style={{ color: 'var(--kc-error)' }}>
              {uploadError}
            </p>
          )}
        </div>

        <DialogFooter className="mt-8 gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-6 py-3 rounded-full font-inter font-semibold text-sm transition-all active:scale-95 cursor-pointer"
            style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text-dim)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-3 rounded-full font-lexend font-bold text-sm uppercase tracking-widest kinetic-gradient transition-all active:scale-95 cursor-pointer"
            style={{ color: 'var(--kc-on-accent)' }}
          >
            Save Match Setup
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
