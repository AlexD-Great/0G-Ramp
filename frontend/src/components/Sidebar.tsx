'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="sidebar ghost-border" style={{ borderLeft: 'none', borderTop: 'none', borderBottom: 'none' }}>
      <div className="sidebar-header" style={{ marginBottom: '3rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(205, 189, 255, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--on-primary-fixed)" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="4"></rect><circle cx="12" cy="12" r="4"></circle></svg>
        </div>
        <div>
          <div className="label-sm" style={{ color: 'var(--on-surface)', marginBottom: '0.1rem' }}>ORCHESTRATOR</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>High-Performance Node</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link href="/dashboard" className={`nav-item ${pathname === '/dashboard' ? 'active' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
          DASHBOARD
        </Link>
        <Link href="/buy" className={`nav-item ${pathname === '/buy' ? 'active' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
          BUY 0G
        </Link>
        <Link href="/terminal" className={`nav-item ${pathname === '/terminal' ? 'active' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          TERMINAL
        </Link>
        <Link href="/insight" className={`nav-item ${pathname === '/insight' ? 'active' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"></path><circle cx="12" cy="12" r="10"></circle></svg>
          HISTORY
        </Link>
        <Link href="/node" className={`nav-item ${pathname === '/node' ? 'active' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5H5a2 2 0 0 1 0-4h16v-4H3z"></path></svg>
          ASSETS
        </Link>
        <Link href="/kyc" className={`nav-item ${pathname === '/kyc' ? 'active' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          KYC
        </Link>
        <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
          HOME
        </Link>
      </div>
      
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--outline-variant)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <a href="https://docs.0g.ai" target="_blank" rel="noreferrer" className="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          DOCS
        </a>
        <a href="https://chainscan-galileo.0g.ai" target="_blank" rel="noreferrer" className="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          EXPLORER
        </a>
      </div>
    </div>
  );
}
