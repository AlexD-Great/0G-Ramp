'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type ChainStatus } from '../lib/api';
import WalletButton from './WalletButton';

export default function TopNav({ brand = 'ORBIT', active = 'BRIDGE', onSidebarToggle }: { brand?: string; active?: string; onSidebarToggle?: () => void }) {
  const [status, setStatus] = useState<ChainStatus | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await api.chainStatus();
        if (alive) { setStatus(s); setErr(false); }
      } catch {
        if (alive) setErr(true);
      }
    };
    tick();
    const id = setInterval(tick, 6000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const live = !!status && !err;
  const label = err
    ? 'BACKEND OFFLINE'
    : status
      ? `BLOCK ${status.blockNumber.toLocaleString()} · CHAIN ${status.chainId}`
      : 'CONNECTING…';

  return (
    <div className="top-nav glass-overlay">
      <div className="top-nav-links items-center">
        <button
          onClick={onSidebarToggle}
          className="sidebar-toggle"
          aria-label="Toggle sidebar"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--on-surface-variant)',
            marginRight: '1rem',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <Link href="/" className="sidebar-brand mr-8 text-gradient-purple" style={{ marginRight: '2rem' }}>
          {brand}
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem',
            borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'var(--font-display)',
            color: err ? 'var(--error, #ff6b6b)' : 'var(--on-surface-variant)',
          }}
        >
          <div className={`status-dot ${live ? 'active' : ''}`} style={!live ? { background: 'var(--on-surface-variant)' } : undefined}></div>
          {label}
        </div>
        <WalletButton />
      </div>
    </div>
  );
}
