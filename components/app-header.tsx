'use client';

import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export type AppSection = 'open-play' | 'scoreboard';

export interface MenuItem {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

const SECTIONS: { id: AppSection; label: string; shortLabel: string }[] = [
  { id: 'open-play', label: 'Open Play', shortLabel: 'Open Play' },
  { id: 'scoreboard', label: 'Scoreboard', shortLabel: 'Score' },
];

interface AppHeaderProps {
  section: AppSection;
  onSectionChange: (section: AppSection) => void;
  menuItems: MenuItem[];
  menuLabel: string;
  wakeLockActive: boolean;
}

/** Fixed top bar: brand, the Open Play / Scoreboard switch, and an options menu. */
export function AppHeader({ section, onSectionChange, menuItems, menuLabel, wakeLockActive }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const online = useOnlineStatus();
  const menuRef = useRef<HTMLDivElement>(null);

  // Dismiss the overflow menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center gap-3 w-full px-4 md:px-6 py-4"
      style={{ background: 'var(--kc-bg)' }}
    >
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <img
          src="/icon-192.png"
          alt=""
          className="w-8 h-8 rounded-lg outline outline-1 outline-[var(--kc-outline-dim)] shrink-0"
        />
        <h1
          className="text-2xl font-black italic tracking-widest font-lexend uppercase hidden md:block truncate"
          style={{ color: 'var(--kc-accent)' }}
        >
          Kitchen Counter
        </h1>
      </div>

      <nav
        aria-label="Sections"
        className="flex items-center p-1 rounded-full shrink-0"
        style={{ background: 'var(--kc-surface-high)' }}
      >
        {SECTIONS.map(item => {
          const isActive = section === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className="px-3 sm:px-4 py-1.5 rounded-full font-lexend text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-colors cursor-pointer whitespace-nowrap"
              style={{
                background: isActive ? 'var(--kc-accent)' : 'transparent',
                color: isActive ? 'var(--kc-on-accent)' : 'var(--kc-text-dim)',
              }}
            >
              <span className="sm:hidden">{item.shortLabel}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        {!online && (
          <span
            role="status"
            className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-1 rounded-full text-[9px] font-lexend font-bold uppercase tracking-widest"
            style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-error)' }}
            title="No connection — everything is saved on this device"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">cloud_off</span>
            <span className="sr-only md:not-sr-only">Offline</span>
          </span>
        )}
        {wakeLockActive && (
          <span
            className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-lexend font-bold uppercase tracking-widest"
            style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text-dim)' }}
            title="The screen will stay on while play is live"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">visibility</span>
            Screen on
          </span>
        )}

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuLabel}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="transition-colors cursor-pointer p-2 rounded-full hover:text-[var(--kc-accent)]"
            style={{ color: menuOpen ? 'var(--kc-accent)' : 'var(--kc-text-dim)' }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">settings</span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-60 rounded-2xl overflow-hidden shadow-2xl animate-fade-in z-50"
              style={{ background: 'var(--kc-surface-high)', border: '1px solid var(--kc-outline-dim)' }}
            >
              {menuItems.map(item => (
                <button
                  key={item.label}
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    item.onClick();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-[var(--kc-surface-highest)]"
                  style={{ color: item.danger ? 'var(--kc-error)' : 'var(--kc-text)' }}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="font-inter text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
