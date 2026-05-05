'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '../../components/TopNav';
import Sidebar from '../../components/Sidebar';
import AuthGate from '../../components/AuthGate';
import { useAuth } from '../../lib/auth';
import { api, type MyKycStatus, type RampTx, type Treasury } from '../../lib/api';

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://chainscan-galileo.0g.ai';

const KYC_LABEL: Record<MyKycStatus['kycStatus'], { text: string; color: string }> = {
  none:      { text: 'NOT SUBMITTED', color: 'var(--on-surface-variant)' },
  submitted: { text: 'SUBMITTED',     color: 'var(--tertiary)' },
  verifying: { text: 'VERIFYING',     color: 'var(--tertiary)' },
  verified:  { text: 'VERIFIED',      color: 'var(--primary)' },
  rejected:  { text: 'REJECTED',      color: '#ff6b6b' },
};

export default function DashboardPage() {
  return (
    <>
      <TopNav brand="OG RAMP CORE" active="DASHBOARD" />
      <div className="flex" style={{ height: 'calc(100vh - 72px)' }}>
        <Sidebar />
        <div className="page-content" style={{ padding: '2rem 3rem', maxWidth: '1200px', flex: 1, overflowY: 'auto' }}>
          <AuthGate>
            <DashboardInner />
          </AuthGate>
        </div>
      </div>
    </>
  );
}

function DashboardInner() {
  const { walletAddress, signOutUser } = useAuth();
  const [kyc, setKyc] = useState<MyKycStatus | null>(null);
  const [txs, setTxs] = useState<RampTx[]>([]);
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const [k, t, tr] = await Promise.all([
          api.myKyc(),
          api.myTransactions(),
          api.treasury().catch(() => null),
        ]);
        if (!alive) return;
        setKyc(k);
        setTxs(t.transactions);
        setTreasury(tr);
        setErr(null);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const settledCount = txs.filter((t) => t.status === 'settled').length;
  const totalSpentUsd = txs.filter((t) => t.status === 'settled').reduce((acc, t) => acc + parseFloat(t.amountIn || '0'), 0);
  const totalReceivedOg = txs.filter((t) => t.status === 'settled').reduce((acc, t) => acc + parseFloat(t.amountOut || '0'), 0);

  const verified = kyc?.kycStatus === 'verified';
  const kycInfo = kyc ? KYC_LABEL[kyc.kycStatus] : KYC_LABEL.none;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <div className="label-sm text-gradient-purple mb-2">SOVEREIGN DASHBOARD</div>
          <h1 className="display-md">YOUR ACCOUNT</h1>
          <div className="label-sm mt-2" style={{ fontFamily: 'monospace' }}>{walletAddress}</div>
        </div>
        <button onClick={() => signOutUser()} className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.7rem' }}>
          SIGN OUT
        </button>
      </div>

      {err && (
        <div style={{ padding: '0.75rem', background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: 'var(--rounded-sm)', fontSize: '0.75rem', color: '#ff6b6b' }}>
          {err}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <StatCard label="KYC STATUS" value={kycInfo.text} color={kycInfo.color} />
        <StatCard label="SETTLED RAMPS" value={settledCount.toString()} />
        <StatCard label="TOTAL SPENT" value={`$${totalSpentUsd.toFixed(2)}`} />
        <StatCard label="0G RECEIVED" value={totalReceivedOg.toFixed(6)} color="var(--primary)" />
      </div>

      <div className="orbit-card ghost-border" style={{ padding: '2rem', background: 'var(--surface-container-low)' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="label-md" style={{ letterSpacing: '0.15em' }}>IDENTITY VERIFICATION</h2>
          <span style={{ color: kycInfo.color, fontSize: '0.75rem', letterSpacing: '0.1em' }}>{kycInfo.text}</span>
        </div>
        {!verified ? (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginBottom: '1rem', lineHeight: 1.5 }}>
              {kyc?.kycStatus === 'rejected'
                ? 'Your previous submission was rejected. Re-submit with a clearer document.'
                : kyc?.kycStatus === 'verifying' || kyc?.kycStatus === 'submitted'
                  ? 'Your document is being verified by 0G Compute. This page auto-refreshes.'
                  : 'KYC must be completed before you can on-ramp. Documents are anchored on 0G Storage and verified by 0G Compute.'}
            </p>
            <Link href="/kyc" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.2em', display: 'inline-block' }}>
              {kyc?.kycStatus === 'none' ? 'START KYC' : 'VIEW KYC'}
            </Link>
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
              Identity verified{kyc?.kycVerifiedAt ? ` on ${new Date(kyc.kycVerifiedAt).toLocaleString()}` : ''}. You can on-ramp now.
            </p>
            <Link href="/buy" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.2em', display: 'inline-block' }}>
              BUY 0G TOKENS
            </Link>
          </>
        )}
      </div>

      <div className="orbit-card ghost-border" style={{ padding: '2rem', background: 'var(--surface-container-low)' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="label-md" style={{ letterSpacing: '0.15em' }}>YOUR TRANSACTIONS</h2>
          {treasury && (
            <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>
              TREASURY: {parseFloat(treasury.balance).toFixed(4)} 0G
            </span>
          )}
        </div>
        {txs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.85rem' }}>
            No ramp transactions yet.{verified ? ' Head to BUY 0G to get started.' : ''}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--outline-variant)', textAlign: 'left' }}>
                  <Th>WHEN</Th>
                  <Th>USD IN</Th>
                  <Th>0G OUT</Th>
                  <Th>STATUS</Th>
                  <Th>EXPLORER</Th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                    <Td>{new Date(t.createdAt).toLocaleString()}</Td>
                    <Td mono>${t.amountIn}</Td>
                    <Td mono>{t.amountOut}</Td>
                    <Td><StatusPill status={t.status} /></Td>
                    <Td>
                      {t.txHash0G
                        ? <a href={`${EXPLORER}/tx/${t.txHash0G}`} target="_blank" rel="noreferrer" style={{ color: 'var(--tertiary)', fontFamily: 'monospace' }}>{t.txHash0G.slice(0, 10)}…</a>
                        : <span style={{ color: 'var(--on-surface-variant)' }}>—</span>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="orbit-card ghost-border" style={{ padding: '1.25rem', background: 'var(--surface-container-low)' }}>
      <div className="label-sm mb-2">{label}</div>
      <div className="display-sm" style={{ color: color ?? 'var(--on-surface)' }}>{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '0.6rem 0.5rem', fontWeight: 500, color: 'var(--on-surface-variant)', letterSpacing: '0.1em', fontSize: '0.65rem' }}>{children}</th>;
}
function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td style={{ padding: '0.6rem 0.5rem', fontFamily: mono ? 'monospace' : undefined }}>{children}</td>;
}
function StatusPill({ status }: { status: string }) {
  const color = status === 'settled' ? 'var(--primary)' : status === 'failed' ? '#ff6b6b' : 'var(--tertiary)';
  return <span style={{ color, letterSpacing: '0.1em', fontSize: '0.7rem' }}>{status.toUpperCase()}</span>;
}
