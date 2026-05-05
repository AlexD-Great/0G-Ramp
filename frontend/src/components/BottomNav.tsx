'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Bottom tab navigation visible on mobile (<768px) only — display rules
 * live in globals.css. Mirrors the four user-facing routes from the desktop
 * sidebar.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const items = [
    { href: '/dashboard', label: 'HOME', icon: HomeIcon },
    { href: '/buy',       label: 'BUY',  icon: BuyIcon },
    { href: '/kyc',       label: 'KYC',  icon: KycIcon },
    { href: '/node',      label: 'VAULT', icon: VaultIcon },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((it) => {
        const active = pathname === it.href || (it.href !== '/' && pathname.startsWith(it.href));
        const Icon = it.icon;
        return (
          <Link key={it.href} href={it.href} className={`bottom-nav-item ${active ? 'active' : ''}`}>
            <Icon active={active} />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'currentColor'} strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>;
}
function BuyIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'currentColor'} strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
}
function KycIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'currentColor'} strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function VaultIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'currentColor'} strokeWidth="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5H5a2 2 0 0 1 0-4h16v-4H3z"/></svg>;
}
