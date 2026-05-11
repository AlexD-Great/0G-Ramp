'use client';
import { useEffect, useState } from 'react';
import { api, type RampTx } from '../lib/api';
import { useAuth } from '../lib/auth';

const EXPLORER = 'https://chainscan-galileo.0g.ai';

export default function LatestReceipt() {
  const { user } = useAuth();
  const [tx, setTx] = useState<RampTx | null>(null);
  const [allCount, setAllCount] = useState(0);

  useEffect(() => {
    if (!user) { setTx(null); setAllCount(0); return; }
    let alive = true;
    const tick = async () => {
      try {
        const { transactions, count } = await api.myTransactions();
        if (!alive) return;
        setAllCount(count);
        setTx(transactions[0] ?? null);
      } catch { /* offline or unauthorized */ }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [user]);

  const downloadReceipt = () => {
    if (!tx) return;
    const blob = new Blob([JSON.stringify(tx, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${tx.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="orbit-card ghost-border flex" style={{ padding: '2.5rem', background: 'var(--surface-container-low)' }}>
        <div style={{ flex: 1 }}>
          <h2 className="display-md" style={{ color: 'var(--on-surface-variant)' }}>SIGN IN TO VIEW YOUR RECEIPT</h2>
          <div className="label-sm mt-2">CONNECT YOUR WALLET TO SEE YOUR LATEST SETTLEMENT</div>
        </div>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="orbit-card ghost-border flex" style={{ padding: '2.5rem', background: 'var(--surface-container-low)' }}>
        <div style={{ flex: 1 }}>
          <h2 className="display-md" style={{ color: 'var(--on-surface-variant)' }}>NO TRANSACTIONS YET</h2>
          <div className="label-sm mt-2">SUBMIT A BRIDGE TX FROM /terminal TO SEE A RECEIPT HERE</div>
        </div>
      </div>
    );
  }

  const explorerUrl = tx.txHash0G ? `${EXPLORER}/tx/${tx.txHash0G}` : `${EXPLORER}/address/${tx.userAddress}`;
  const verified = tx.status === 'settled';

  return (
    <div className="orbit-card ghost-border flex" style={{ padding: '2.5rem', background: 'var(--surface-container-low)' }}>
      <div style={{ flex: 1, paddingRight: '2rem', borderRight: '1px dashed var(--outline-variant)' }}>
        <div className="flex gap-4 items-center mb-8">
          <div style={{ width: '64px', height: '64px', background: verified ? 'var(--primary)' : 'var(--tertiary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--on-primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={verified ? 'var(--primary)' : 'var(--tertiary)'} strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
          <div>
            <h2 className="display-md mb-1" style={{ fontStyle: 'italic', color: 'var(--on-surface)' }}>
              {verified ? 'VERIFIED' : tx.status.toUpperCase()}
            </h2>
            <div className="label-sm">{allCount} TRANSACTION{allCount === 1 ? '' : 'S'} ON RECORD</div>
          </div>
        </div>

        <div className="orbit-card ghost-border mb-4" style={{ padding: '1rem', background: 'var(--surface)' }}>
          <div className="label-sm mb-2 text-gradient">STORAGE ROOT HASH</div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
            {tx.storageRootHash ?? '—  (anchored once payout completes)'}
          </div>
        </div>

        <div className="orbit-card ghost-border" style={{ padding: '1rem', background: 'var(--surface)' }}>
          <div className="label-sm mb-2 text-gradient">SETTLEMENT TX</div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
            {tx.txHash0G ?? '—  (pending payout)'}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between" style={{ paddingLeft: '2rem', width: '200px' }}>
        <div className="text-right">
          <div className="label-sm text-gradient-purple">TIMESTAMP</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{new Date(tx.createdAt).toISOString()}</div>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: '1.6' }}>
          TX <strong>{tx.id.slice(0, 8)}…</strong> for <strong>{tx.amountIn} {tx.assetSymbol}</strong> on the <strong style={{ color: 'var(--primary)' }}>0G Galileo Compute Mesh</strong>.
        </p>
        <div className="flex flex-col gap-2 mt-4">
          <a href={explorerUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '0.75rem', textAlign: 'center' }}>VIEW ON EXPLORER</a>
          <button onClick={downloadReceipt} className="btn btn-secondary" style={{ padding: '0.75rem' }}>DOWNLOAD RECEIPT</button>
        </div>
      </div>
    </div>
  );
}
