'use client';
import { useEffect, useMemo, useState } from 'react';
import { api, type PublicRampTx } from '../lib/api';

export default function LiveLedgerTable() {
  const [txs, setTxs] = useState<PublicRampTx[]>([]);
  const [filter, setFilter] = useState('');
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
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return txs;
    const q = filter.toLowerCase();
    return txs.filter((tx) =>
      tx.id.toLowerCase().includes(q) ||
      tx.userAddressMasked.toLowerCase().includes(q) ||
      tx.assetSymbol.toLowerCase().includes(q) ||
      tx.status.toLowerCase().includes(q),
    );
  }, [txs, filter]);

  const fmtTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`;
  };

  const statusColor = (s: string) => s === 'settled' ? 'var(--primary)' : s === 'failed' ? '#ff6b6b' : 'var(--tertiary)';

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h2 className="label-md" style={{ letterSpacing: '0.15em', color: 'var(--on-surface)' }}>CHRONOLOGICAL LEDGER</h2>
        <div className="flex gap-2">
          <div className="input-container" style={{ margin: 0, padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              type="text"
              placeholder="Filter ledger..."
              style={{ fontSize: '0.75rem', background: 'transparent', border: 'none', outline: 'none', color: 'var(--on-surface)' }}
            />
          </div>
        </div>
      </div>

      {err && <div className="label-sm" style={{ color: '#ff6b6b', marginBottom: '1rem' }}>BACKEND OFFLINE</div>}

      {filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
          {txs.length === 0 ? 'NO TRANSACTIONS YET' : 'NO MATCHES FOR FILTER'}
        </div>
      ) : (
        <div className="table-cards table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'var(--font-display)' }}>
            <thead>
              <tr style={{ color: 'var(--on-surface-variant)', borderBottom: '1px solid var(--outline-variant)', textAlign: 'left' }}>
                <th style={{ padding: '1rem', fontWeight: 'normal' }}>TIMESTAMP</th>
                <th style={{ padding: '1rem', fontWeight: 'normal' }}>ROUTE</th>
                <th style={{ padding: '1rem', fontWeight: 'normal' }}>ASSET</th>
                <th style={{ padding: '1rem', fontWeight: 'normal' }}>AMOUNT</th>
                <th style={{ padding: '1rem', fontWeight: 'normal' }}>STATUS</th>
                <th style={{ padding: '1rem', fontWeight: 'normal' }}>USER</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 25).map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                  <td style={{ padding: '1.5rem 1rem', color: 'var(--on-surface-variant)' }}>{fmtTime(tx.createdAt)}</td>
                  <td style={{ padding: '1.5rem 1rem' }}>{tx.sourceChain} → {tx.destChain}</td>
                  <td style={{ padding: '1.5rem 1rem', color: 'var(--primary)' }}>{tx.assetSymbol}</td>
                  <td style={{ padding: '1.5rem 1rem', fontWeight: 'bold' }}>{tx.amountIn}</td>
                  <td style={{ padding: '1.5rem 1rem' }}>
                    <span style={{ border: `1px solid ${statusColor(tx.status)}`, color: statusColor(tx.status), padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                      {tx.status}
                    </span>
                  </td>
                  <td style={{ padding: '1.5rem 1rem', color: 'var(--on-surface-variant)' }}>
                    <span>{tx.userAddressMasked}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.slice(0, 25).map((tx) => (
            <div key={`card-${tx.id}`} className="row-card">
              <div className="row-card-line"><span className="k">When</span><span className="v">{fmtTime(tx.createdAt)}</span></div>
              <div className="row-card-line"><span className="k">Route</span><span className="v">{tx.sourceChain} → {tx.destChain}</span></div>
              <div className="row-card-line"><span className="k">Asset</span><span className="v" style={{ color: 'var(--primary)' }}>{tx.assetSymbol}</span></div>
              <div className="row-card-line"><span className="k">Amount</span><span className="v" style={{ fontWeight: 'bold' }}>{tx.amountIn}</span></div>
              <div className="row-card-line">
                <span className="k">Status</span>
                <span className="v">
                  <span style={{ border: `1px solid ${statusColor(tx.status)}`, color: statusColor(tx.status), padding: '0.15rem 0.45rem', borderRadius: '1rem', fontSize: '0.6rem', textTransform: 'uppercase' }}>
                    {tx.status}
                  </span>
                </span>
              </div>
              <div className="row-card-line">
                <span className="k">User</span>
                <span className="v">{tx.userAddressMasked}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
