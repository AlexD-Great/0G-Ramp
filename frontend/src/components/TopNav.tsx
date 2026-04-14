'use client';
import Link from 'next/link';

export default function TopNav({ brand = "ORBIT", active = "BRIDGE" }: { brand?: string, active?: string }) {
  return (
    <div className="top-nav glass-overlay">
      <div className="top-nav-links items-center">
        <Link href="/" className="sidebar-brand mr-8 text-gradient-purple" style={{ marginRight: '2rem' }}>
          {brand}
        </Link>
        <Link href="/" className={`top-nav-link ${active === "BRIDGE" ? "active" : ""}`}>
          BRIDGE
        </Link>
        <Link href="/terminal" className={`top-nav-link ${active === "SWAP" ? "active" : ""}`}>
          SWAP
        </Link>
        <Link href="/node" className={`top-nav-link ${active === "LIQUIDITY" ? "active" : ""}`}>
          LIQUIDITY
        </Link>
        <Link href="/insight" className={`top-nav-link ${active === "STAKE" ? "active" : ""}`}>
          STAKE
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'var(--font-display)', color: 'var(--on-surface-variant)' }}>
          <div className="status-dot active"></div>
          SYSTEM OPTIMAL
        </div>
        <button className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.75rem' }}>
          CONNECT WALLET
        </button>
      </div>
    </div>
  );
}
