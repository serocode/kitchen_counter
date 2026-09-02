import { ImageResponse } from 'next/og';
import { siteDescriptionShort, siteName, siteTagline } from '@/lib/site';

export const alt = `${siteName} — ${siteTagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Brand tokens are duplicated from globals.css: Satori resolves no CSS variables
// and never sees the stylesheet, so these must be literal values.
const BG = '#090e15';
const SURFACE = '#141a23';
const ACCENT = '#D1FF00';
const TEXT = '#edf1fb';
const TEXT_DIM = '#a7abb5';
const TEAM_A = '#6fb6ff';
const TEAM_B = '#ff8a75';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BG,
          padding: '56px 72px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: ACCENT,
            }}
          >
            {siteName}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 22,
              fontSize: 66,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: TEXT,
            }}
          >
            {siteTagline}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 24,
              maxWidth: 760,
              fontSize: 26,
              lineHeight: 1.4,
              color: TEXT_DIM,
            }}
          >
            {siteDescriptionShort}
          </div>
        </div>

        {/* A miniature of the scoreboard: the product, not just a wordmark. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <ScoreTile label="TEAM A" value="11" color={TEAM_A} />
          <ScoreTile label="TEAM B" value="9" color={TEAM_B} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '18px 30px',
              borderRadius: 22,
              background: ACCENT,
              color: '#4b5e00',
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            SERVER 2
          </div>
        </div>
      </div>
    ),
    size,
  );
}

function ScoreTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '14px 38px',
        borderRadius: 22,
        background: SURFACE,
        border: `2px solid ${color}`,
      }}
    >
      <div style={{ display: 'flex', fontSize: 18, letterSpacing: 4, color }}>{label}</div>
      <div style={{ display: 'flex', fontSize: 58, fontWeight: 800, color: TEXT }}>{value}</div>
    </div>
  );
}
