'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type ChainStatus } from '../lib/api';
import WalletButton from './WalletButton';

export default function TopNav({ brand = 'ORBIT', active = 'BRIDGE' }: { brand?: string; active?: string }) {
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
        <Link href="/" className="sidebar-brand mr-8 text-gradient-purple" style={{ marginRight: '2rem' }}>
          {brand}
        </Link>
        <Link href="/" className={`top-nav-link ${active === 'BRIDGE' ? 'active' : ''}`}>BRIDGE</Link>
        <Link href="/terminal" className={`top-nav-link ${active === 'SWAP' ? 'active' : ''}`}>SWAP</Link>
        <Link href="/node" className={`top-nav-link ${active === 'LIQUIDITY' ? 'active' : ''}`}>LIQUIDITY</Link>
        <Link href="/insight" className={`top-nav-link ${active === 'STAKE' ? 'active' : ''}`}>STAKE</Link>
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
