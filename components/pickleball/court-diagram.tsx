'use client';

import { useId } from 'react';
import { GameState, otherTeam } from '@/lib/pickleball-state';

interface CourtDiagramProps {
  gameState: GameState | null;
  servingTeam: 'A' | 'B';
  serverPosition: 'right' | 'left';
  servingPlayerIndex: 0 | 1;
  receivingPlayerIndex: 0 | 1;
}

/* ── Court geometry, to scale with a regulation 44 × 20 ft court ───────────── */
const VIEW_W = 52;
const VIEW_H = 30;
const COURT_X = 4;
const COURT_Y = 5;
const COURT_W = 44;
const COURT_H = 20;
const NET_X = COURT_X + COURT_W / 2;
const NVZ = 7;                               // non-volley zone, each side of the net
const SERVICE_DEPTH = COURT_W / 2 - NVZ;     // baseline → kitchen line

const TEAM_COLOR = { A: 'var(--kc-team-a)', B: 'var(--kc-team-b)' } as const;

type Court = 'right' | 'left';

/**
 * Where a player stands, viewed from above with the net running vertically.
 *
 * Team A defends the left half and faces right, so their right/even court is
 * the LOWER box; Team B faces the other way, so theirs is the UPPER box. That
 * places the two even courts diagonally opposite each other — which is exactly
 * why every serve is crosscourt.
 */
function markerPosition(team: 'A' | 'B', court: Court) {
  const x =
    team === 'A'
      ? COURT_X + SERVICE_DEPTH / 2
      : COURT_X + COURT_W - SERVICE_DEPTH / 2;
  const isLower = team === 'A' ? court === 'right' : court === 'left';
  return { x, y: COURT_Y + COURT_H * (isLower ? 0.75 : 0.25) };
}

const pctX = (x: number) => `${(x / VIEW_W) * 100}%`;
const pctY = (y: number) => `${(y / VIEW_H) * 100}%`;

/**
 * The ball, sitting with whoever is serving. Lime because that is what
 * "serving / live" means everywhere else in the app — the team colours
 * deliberately stay off the accent so this reads unambiguously.
 */
function NeonBall() {
  const shineId = useId();
  return (
    <span className="relative flex items-center justify-center">
      <span
        className="absolute w-6 h-6 md:w-8 md:h-8 rounded-full animate-ping"
        style={{ background: 'var(--kc-accent)', opacity: 0.22 }}
      />
      <span
        className="absolute w-5 h-5 md:w-6 md:h-6 rounded-full"
        style={{ background: 'var(--kc-accent)', opacity: 0.18, filter: 'blur(4px)' }}
      />
      <svg
        viewBox="0 0 20 20"
        className="relative w-[18px] h-[18px] md:w-[22px] md:h-[22px]"
        style={{ filter: 'drop-shadow(0 0 6px var(--kc-accent)) drop-shadow(0 0 14px var(--kc-accent-glow-strong))' }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={shineId} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="10" cy="10" r="9" fill="var(--kc-accent)" />
        <circle cx="10" cy="10" r="9" fill={`url(#${shineId})`} />
        {/* Wiffle-ball holes, just enough to read as a pickleball. */}
        {[[6.4, 6.6], [13.4, 7.2], [7.2, 13.4], [13, 13], [10, 9.8]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="1.35" fill="var(--kc-on-accent)" opacity="0.5" />
        ))}
      </svg>
    </span>
  );
}

/** A player's dot and name, laid over the court at their service box. */
function PlayerMarker({
  name,
  color,
  x,
  y,
  role,
}: {
  name: string;
  color: string;
  x: number;
  y: number;
  role: 'server' | 'receiver' | null;
}) {
  const isServer = role === 'server';
  const isReceiver = role === 'receiver';

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 md:gap-1 pointer-events-none"
      style={{ left: pctX(x), top: pctY(y), maxWidth: '27%' }}
    >
      {isServer ? (
        <NeonBall />
      ) : (
        <span className="relative flex items-center justify-center h-[18px] md:h-[22px]">
          <span
            className="relative rounded-full transition-all duration-300"
            style={{
              width: 12,
              height: 12,
              background: color,
              opacity: isReceiver ? 1 : 0.45,
              boxShadow: isReceiver ? `0 0 10px ${color}` : 'none',
              outline: isReceiver ? `1.5px dashed ${color}` : 'none',
              outlineOffset: 3,
            }}
          />
        </span>
      )}

      <span
        className="px-1 md:px-1.5 py-0.5 rounded font-inter text-[9px] md:text-[10px] leading-tight font-semibold truncate max-w-full"
        style={{
          background: 'rgba(9, 14, 21, 0.72)',
          color,
          opacity: role ? 1 : 0.6,
        }}
      >
        {name}
      </span>

      {role && (
        <span
          className="font-lexend text-[7px] md:text-[8px] font-bold uppercase tracking-widest leading-none"
          style={{ color: isServer ? 'var(--kc-accent)' : 'var(--kc-text-muted)' }}
        >
          {isServer ? 'Serves' : 'Receives'}
        </span>
      )}
    </div>
  );
}

export function CourtDiagram({
  gameState,
  servingTeam,
  serverPosition,
  servingPlayerIndex,
  receivingPlayerIndex,
}: CourtDiagramProps) {
  const patternId = useId();

  if (!gameState) {
    return <div className="h-64 rounded-[32px] animate-pulse" style={{ background: 'var(--kc-surface)' }} />;
  }

  const receivingTeam = otherTeam(servingTeam);

  const serverName = gameState.teams[servingTeam].players[servingPlayerIndex].name;
  const receiverName = gameState.teams[receivingTeam].players[receivingPlayerIndex].name;

  // index 1 is the right/even court, index 0 the left/odd court.
  const courtOf = (index: 0 | 1): Court => (index === 1 ? 'right' : 'left');

  const players = ([
    { team: 'A' as const, index: 0 as const },
    { team: 'A' as const, index: 1 as const },
    { team: 'B' as const, index: 0 as const },
    { team: 'B' as const, index: 1 as const },
  ]).map(({ team, index }) => {
    const isServer = team === servingTeam && index === servingPlayerIndex;
    const isReceiver = team === receivingTeam && index === receivingPlayerIndex;
    return {
      key: `${team}${index}`,
      name: gameState.teams[team].players[index].name,
      color: TEAM_COLOR[team],
      role: isServer ? ('server' as const) : isReceiver ? ('receiver' as const) : null,
      ...markerPosition(team, courtOf(index)),
    };
  });

  // Serve trajectory: server → receiver, trimmed clear of both dots.
  const from = markerPosition(servingTeam, courtOf(servingPlayerIndex));
  const to = markerPosition(receivingTeam, courtOf(receivingPlayerIndex));
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const GAP = 2.9;
  const start = { x: from.x + ux * GAP, y: from.y + uy * GAP };
  const end = { x: to.x - ux * GAP, y: to.y - uy * GAP };

  // Arrowhead built from the direction vector, so it scales with the viewBox.
  const head = 1.2;
  const arrow = [
    `${end.x},${end.y}`,
    `${end.x - ux * head + -uy * head * 0.62},${end.y - uy * head + ux * head * 0.62}`,
    `${end.x - ux * head - -uy * head * 0.62},${end.y - uy * head - ux * head * 0.62}`,
  ].join(' ');

  const serveColor = 'var(--kc-accent)';
  const line = { stroke: 'var(--kc-outline)', strokeWidth: 1.25, vectorEffect: 'non-scaling-stroke' as const };

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* ===== Court ===== */}
      <div className="md:col-span-2 rounded-2xl md:rounded-[32px] p-4 md:p-6" style={{ background: 'var(--kc-surface)' }}>
        {/* Header + team key */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm" style={{ color: 'var(--kc-accent)' }} aria-hidden="true">
              sports_tennis
            </span>
            <span
              className="font-inter text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--kc-text-dim)' }}
            >
              Court Positions
            </span>
          </div>
          <div className="flex items-center gap-3">
            {(['A', 'B'] as const).map(team => (
              <span key={team} className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: TEAM_COLOR[team] }}
                />
                <span
                  className="font-lexend text-[9px] font-bold uppercase tracking-widest truncate max-w-[90px]"
                  style={{ color: 'var(--kc-text-dim)' }}
                >
                  {gameState.teams[team].name}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Court */}
        <div
          className="relative w-full"
          style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
          role="img"
          aria-label={
            `Top-down court. ${serverName} of ${gameState.teams[servingTeam].name} serves from the ` +
            `${serverPosition} court to ${receiverName} of ${gameState.teams[receivingTeam].name}.`
          }
        >
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 w-full h-full">
            <defs>
              {(['A', 'B'] as const).map(team => (
                <pattern
                  key={team}
                  id={`${patternId}-${team}`}
                  width="2.4"
                  height="2.4"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0" y1="0" x2="0" y2="2.4"
                    stroke={TEAM_COLOR[team]}
                    strokeWidth="0.7"
                    opacity="0.16"
                  />
                </pattern>
              ))}
            </defs>

            {/* Playing surface */}
            <rect
              x={COURT_X} y={COURT_Y} width={COURT_W} height={COURT_H}
              rx="0.5"
              fill="var(--kc-surface-mid)"
            />

            {/* Each team's half, faintly tinted so sides read at a glance */}
            <rect
              x={COURT_X} y={COURT_Y} width={COURT_W / 2} height={COURT_H}
              fill={TEAM_COLOR.A} opacity="0.04"
            />
            <rect
              x={NET_X} y={COURT_Y} width={COURT_W / 2} height={COURT_H}
              fill={TEAM_COLOR.B} opacity="0.04"
            />

            {/* Non-volley zones — the kitchen */}
            <rect
              x={NET_X - NVZ} y={COURT_Y} width={NVZ} height={COURT_H}
              fill={`url(#${patternId}-A)`}
            />
            <rect
              x={NET_X} y={COURT_Y} width={NVZ} height={COURT_H}
              fill={`url(#${patternId}-B)`}
            />

            {/* Centre lines — only between baseline and kitchen line */}
            <line
              x1={COURT_X} y1={COURT_Y + COURT_H / 2}
              x2={COURT_X + SERVICE_DEPTH} y2={COURT_Y + COURT_H / 2}
              {...line}
            />
            <line
              x1={COURT_X + COURT_W - SERVICE_DEPTH} y1={COURT_Y + COURT_H / 2}
              x2={COURT_X + COURT_W} y2={COURT_Y + COURT_H / 2}
              {...line}
            />

            {/* Kitchen lines */}
            <line x1={NET_X - NVZ} y1={COURT_Y} x2={NET_X - NVZ} y2={COURT_Y + COURT_H}
              stroke={TEAM_COLOR.A} strokeWidth="1.25" opacity="0.55" vectorEffect="non-scaling-stroke" />
            <line x1={NET_X + NVZ} y1={COURT_Y} x2={NET_X + NVZ} y2={COURT_Y + COURT_H}
              stroke={TEAM_COLOR.B} strokeWidth="1.25" opacity="0.55" vectorEffect="non-scaling-stroke" />

            {/* Court outline */}
            <rect
              x={COURT_X} y={COURT_Y} width={COURT_W} height={COURT_H}
              rx="0.5" fill="none" {...line} strokeWidth={1.75}
            />

            {/* Serve trajectory */}
            <line
              x1={start.x} y1={start.y} x2={end.x} y2={end.y}
              stroke={serveColor} strokeWidth="1.25" strokeDasharray="3 3"
              opacity="0.75" vectorEffect="non-scaling-stroke" strokeLinecap="round"
            />
            <polygon points={arrow} fill={serveColor} opacity="0.9" />

            {/* Net, with posts standing slightly proud of the sidelines */}
            <line
              x1={NET_X} y1={COURT_Y - 2} x2={NET_X} y2={COURT_Y + COURT_H + 2}
              stroke="var(--kc-text-dim)" strokeWidth="2" vectorEffect="non-scaling-stroke"
            />
            <line
              x1={NET_X} y1={COURT_Y} x2={NET_X} y2={COURT_Y + COURT_H}
              stroke="var(--kc-text)" strokeWidth="3.5" strokeDasharray="1.5 1.5"
              opacity="0.5" vectorEffect="non-scaling-stroke"
            />
            <text
              x={NET_X} y={COURT_Y - 2.6} textAnchor="middle"
              fill="var(--kc-text-muted)" fontSize="2"
              className="font-lexend" letterSpacing="0.4"
            >
              NET
            </text>
          </svg>

          {players.map(p => (
            <PlayerMarker key={p.key} name={p.name} color={p.color} x={p.x} y={p.y} role={p.role} />
          ))}
        </div>

        {/* Caption */}
        <p className="mt-4 text-[11px] font-inter leading-snug text-center" style={{ color: 'var(--kc-text-dim)' }}>
          <span style={{ color: serveColor, fontWeight: 600 }}>{serverName}</span> serves from the{' '}
          <span style={{ color: 'var(--kc-text)' }}>{serverPosition}</span> court to{' '}
          <span style={{ color: 'var(--kc-text)' }}>{receiverName}</span>
        </p>
      </div>

      {/* ===== Score Call ===== */}
      <div
        className="relative rounded-2xl md:rounded-[32px] p-5 md:p-6 flex flex-col justify-between text-center overflow-hidden"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, rgba(209,255,0,0.08) 0%, transparent 60%), var(--kc-surface)',
          border: '1px solid var(--kc-outline-dim)',
        }}
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="material-symbols-outlined text-xl" style={{ color: 'var(--kc-accent)' }} aria-hidden="true">
            campaign
          </span>
          <span
            className="font-lexend text-sm md:text-base font-extrabold uppercase tracking-[0.2em]"
            style={{ color: 'var(--kc-text)' }}
          >
            Score Call
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Each number is labelled beneath itself so the call is learnable. */}
          <div className="grid grid-cols-3 gap-x-2 items-end">
            {[
              { value: gameState.teams[servingTeam].score, label: 'Serving' },
              { value: gameState.teams[receivingTeam].score, label: 'Receiving' },
              { value: gameState.serving.serverNumber, label: 'Server' },
            ].map(({ value, label }, index) => (
              <div key={label} className="flex flex-col items-center">
                <div className="flex items-end">
                  {index > 0 && (
                    <span
                      className="text-3xl md:text-4xl font-lexend font-black leading-none pb-0.5 pr-2"
                      style={{ color: 'var(--kc-text-muted)' }}
                      aria-hidden="true"
                    >
                      -
                    </span>
                  )}
                  <span
                    className="text-5xl md:text-6xl font-lexend font-black tracking-tight leading-none"
                    style={{ color: 'var(--kc-text)' }}
                  >
                    {value}
                  </span>
                </div>
                <span
                  className="mt-2 text-[9px] font-inter font-bold uppercase tracking-wider"
                  style={{ color: 'var(--kc-text-dim)' }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {gameState.serving.isFirstServe && (
          <div className="mt-4 px-3 py-2 rounded-xl text-center" style={{ background: 'var(--kc-surface-highest)' }}>
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--kc-text-dim)' }}
            >
              ⚡ First serve — one server only
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
