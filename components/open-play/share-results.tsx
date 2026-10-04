'use client';

import { useEffect, useRef, useState } from 'react';
import {
  formatSessionCsv,
  formatSessionSummary,
  sessionFileName,
  type SessionReport,
} from '@/lib/open-play-stats';

const NOTICE_MS = 3000;

function ActionButton({ icon, children, onClick }: { icon: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-lexend font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
      style={{ background: 'var(--kc-surface-highest)', color: 'var(--kc-text)' }}
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        {icon}
      </span>
      {children}
    </button>
  );
}

/**
 * Three ways to take the results with you: copy a recap for a group chat, hand
 * it to the phone's share sheet, or save every game as a spreadsheet. The
 * text and file are built on tap, not on every render.
 */
export function ShareResults({ report }: { report: SessionReport }) {
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const say = (text: string, error = false) => {
    setNotice({ text, error });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), NOTICE_MS);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatSessionSummary(report));
      say('Results copied.');
    } catch {
      say('Could not copy — try Share or CSV instead.', true);
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: 'Open play results', text: formatSessionSummary(report) });
    } catch (error) {
      // Closing the share sheet is a choice, not a failure.
      if (!(error instanceof DOMException && error.name === 'AbortError')) say('Could not share.', true);
    }
  };

  const download = () => {
    // The byte-order mark makes Excel read accented names as UTF-8.
    const blob = new Blob(['﻿', formatSessionCsv(report)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sessionFileName(report.results);
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    say('Saved a CSV with standings and every game.');
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <ActionButton icon="content_copy" onClick={copy}>
          Copy
        </ActionButton>
        {canShare && (
          <ActionButton icon="ios_share" onClick={share}>
            Share
          </ActionButton>
        )}
        <ActionButton icon="download" onClick={download}>
          CSV
        </ActionButton>
      </div>
      <p
        role="status"
        className="text-xs font-inter min-h-4"
        style={{ color: notice?.error ? 'var(--kc-error)' : 'var(--kc-text-dim)' }}
      >
        {notice?.text}
      </p>
    </div>
  );
}
