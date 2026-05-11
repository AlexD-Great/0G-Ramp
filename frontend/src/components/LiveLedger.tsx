'use client';
import { useEffect, useState } from 'react';
import { api, type PublicRampTx } from '../lib/api';

const STATUS_PROGRESS: Record<string, string> = {
  settled: '100%',
  payout: '80%',
  verifying: '60%',
  pending: '20%',
  failed: '100%',
};

export default function LiveLedger({ refreshKey = 0 }: { refreshKey?: number }) {
  const [txs, setTxs] = useState<PublicRampTx[]>([]);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const { transactions } = await api.listTransactions();
        if (alive) { setTxs(transactions); setErr(false); }
      } catch {
        if (alive) setErr(true);
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [refreshKey]);

  if (err) {
    return <div className="label-sm" style={{ color: '#ff6b6b' }}>BACKEND OFFLINE</div>;
  }
  if (!txs.length) {
    return (
      <div className="orbit-card ghost-border" style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--surface-container-low)' }}>
        <div className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>NO TRANSACTIONS YET</div>
        <div style={{ fontSize: '0.65rem', marginTop: '0.5rem', color: 'var(--on-surface-variant)' }}>SUBMIT ONE BELOW TO SEE IT HERE</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {txs.slice(0, 6).map((tx) => {
        const ageSec = Math.floor((Date.now() - tx.createdAt) / 1000);
        const ageLabel = ageSec < 60 ? `${ageSec}S AGO` : ageSec < 3600 ? `${Math.floor(ageSec / 60)}M AGO` : `${Math.floor(ageSec / 3600)}H AGO`;
        const isPending = tx.status === 'pending' || tx.status === 'verifying';
        const isDone = tx.status === 'settled';
        const isFail = tx.status === 'failed';
        const progress = STATUS_PROGRESS[tx.status] ?? '20%';

        return (
          <div key={tx.id} className={`orbit-card ghost-border ${isPending ? 'active-indicator' : ''}`} style={{ padding: '1rem', background: 'var(--surface-container-low)' }}>
            <div className="flex justify-between items-center mb-4">
              <div className="label-sm" style={{ color: isPending ? 'var(--tertiary)' : isFail ? '#ff6b6b' : 'var(--on-surface)' }}>
                TX {tx.id.slice(0, 4).toUpperCase()}…{tx.id.slice(-2).toUpperCase()}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>{ageLabel}</div>
            </div>
            <div className="flex justify-between items-end mb-2">
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                {tx.amountIn} <span style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>{tx.assetSymbol}</span>
              </div>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: isDone ? 'var(--primary)' : isPending ? 'var(--tertiary)' : isFail ? '#ff6b6b' : 'var(--on-surface-variant)' }}>
                {tx.status}
              </div>
            </div>
            <div style={{ width: '100%', height: '2px', background: 'var(--outline-variant)', borderRadius: '1px', marginBottom: '0.75rem' }}>
              <div style={{ width: progress, height: '100%', background: isFail ? '#ff6b6b' : isPending ? 'var(--tertiary)' : 'var(--primary)' }}></div>
            </div>
            <div className="flex gap-2" style={{ fontSize: '0.6rem' }}>
              <a href="/insight" style={{ flex: 1, textAlign: 'center', padding: '0.35rem', border: '1px solid var(--outline-variant)', borderRadius: '2px', color: 'var(--on-surface-variant)', textDecoration: 'none' }}>RECEIPT</a>
              <span style={{ flex: 1, textAlign: 'center', padding: '0.35rem', border: '1px solid var(--outline-variant)', borderRadius: '2px', color: 'var(--on-surface-variant)' }}>{tx.userAddressMasked}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
