'use client';
import { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav';
import Sidebar from '../../components/Sidebar';
import LiveLedgerTable from '../../components/LiveLedgerTable';
import { api, type ChainStatus, type Treasury, type WalletStatus } from '../../lib/api';

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://chainscan-galileo.0g.ai';

export default function NodePage() {
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [chain, setChain] = useState<ChainStatus | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletStatus | null>(null);
  const [txCount, setTxCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const [t, c, w, txs] = await Promise.all([
        api.treasury().catch(() => null),
        api.chainStatus().catch(() => null),
        api.walletStatus().catch(() => null),
        api.listTransactions().catch(() => null),
      ]);
      if (!alive) return;
      setTreasury(t);
      setChain(c);
      if (w && !('error' in w)) setWalletInfo(w as WalletStatus);
      else setWalletInfo(null);
      setTxCount(txs?.count ?? null);
    };
    tick();
    const id = setInterval(tick, 6000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const treasuryBalance = treasury ? parseFloat(treasury.balance) : null;
  const treasuryLow = treasuryBalance !== null && treasuryBalance < 0.05;
  const gasHealthy = walletInfo?.gasHealthy ?? false;

  return (
    <>
      <TopNav brand="ORBIT" active="LIQUIDITY" />
      <div className="flex" style={{ height: 'calc(100vh - 72px)' }}>
        <Sidebar />
        <div className="page-content flex flex-col gap-8" style={{ padding: '2rem 3rem', maxWidth: '1200px', flex: 1, overflowY: 'auto' }}>

          <div className="flex gap-8 stack-on-mobile">
            <div className="orbit-card ghost-border flex-col justify-center" style={{ flex: 2, padding: '2.5rem', background: 'var(--surface-container-lowest)' }}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="label-md mb-1" style={{ color: 'var(--primary)' }}>OG RAMP PAYOUT VAULT</h2>
                  <div className="label-sm" style={{ fontFamily: 'monospace' }}>
                    {treasury ? `${treasury.contract.slice(0, 10)}…${treasury.contract.slice(-6)}` : 'Loading…'}
                  </div>
                </div>
                <div className="btn" style={{ background: 'var(--surface)', border: `1px solid ${treasuryLow ? '#ff6b6b' : 'var(--outline-variant)'}`, fontSize: '0.65rem', color: treasuryLow ? '#ff6b6b' : 'var(--on-surface-variant)' }}>
                  {treasuryLow ? 'LOW BALANCE' : treasury ? 'OPERATIONAL' : 'UNKNOWN'}
                </div>
              </div>

              <div className="mb-8">
                <span className="display-lg" style={{ color: treasuryLow ? '#ff6b6b' : 'var(--on-surface)' }}>
                  {treasuryBalance !== null ? treasuryBalance.toFixed(4) : '—'}
                </span>
                <span className="display-sm" style={{ color: 'var(--primary)', marginLeft: '1rem' }}>0G</span>
              </div>

              <div className="flex gap-4">
                <a href="/buy" className="btn btn-primary" style={{ padding: '1rem 3rem' }}>BUY 0G</a>
                {treasury && (
                  <a href={`${EXPLORER}/address/${treasury.contract}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '1rem 3rem' }}>
                    VIEW ON EXPLORER
                  </a>
                )}
              </div>
            </div>

            <div className="orbit-card ghost-border active-indicator" style={{ flex: 1, padding: '2.5rem', background: 'var(--surface)' }}>
              <h3 className="label-md mb-6" style={{ letterSpacing: '0.15em' }}>NODE HEALTH</h3>

              <HealthRow label="0G CHAIN RPC" value={chain ? `BLOCK ${chain.blockNumber.toLocaleString()}` : 'Connecting…'} ok={!!chain} />
              <HealthRow label="CHAIN ID" value={chain ? String(chain.chainId) : '—'} ok={!!chain} />
              <HealthRow label="HOT WALLET GAS" value={walletInfo ? `${parseFloat(walletInfo.nativeBalance).toFixed(4)} ${walletInfo.unit}` : '—'} ok={gasHealthy} />
              <HealthRow label="TREASURY" value={treasury ? `${treasuryBalance!.toFixed(4)} 0G` : '—'} ok={!!treasury && !treasuryLow} />
              <HealthRow label="LEDGER TX COUNT" value={txCount !== null ? String(txCount) : '—'} ok={txCount !== null} />
            </div>
          </div>

          <div className="orbit-card ghost-border" style={{ padding: '2.5rem', background: 'var(--surface-container-low)' }}>
            <LiveLedgerTable />
          </div>

          <div className="data-ribbon justify-end text-gradient" style={{ padding: '0.5rem 0', margin: 'auto 0 -2rem 0', background: 'transparent' }}>
            <div className="flex gap-8 stack-on-mobile" style={{ fontSize: '0.7rem' }}>
              <div style={{ color: 'var(--on-surface)' }}>0G GALILEO TESTNET</div>
              {chain && (
                <div className="flex items-center gap-2">
                  <div className="status-dot active"></div> CHAIN {chain.chainId} · BLOCK {chain.blockNumber.toLocaleString()}
                </div>
              )}
              {walletInfo && (
                <div style={{ color: gasHealthy ? 'var(--tertiary)' : '#ff6b6b' }}>
                  HOT WALLET {gasHealthy ? 'HEALTHY' : 'LOW GAS'}
                </div>
              )}
              <a href={EXPLORER} target="_blank" rel="noreferrer" style={{ color: 'var(--on-surface-variant)' }}>EXPLORER</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function HealthRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex justify-between items-center mb-3" style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--outline-variant)' }}>
      <div className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>{label}</div>
      <div className="flex items-center gap-2 label-sm" style={{ color: ok ? 'var(--on-surface)' : '#ff6b6b', fontFamily: 'monospace', fontSize: '0.75rem' }}>
        {value}
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ok ? 'var(--primary)' : '#ff6b6b' }} />
      </div>
    </div>
  );
}
