'use client';
import { useEffect, useState } from 'react';
import { api, type ChainStatus, type ComputeBalance } from '../lib/api';

type ComputeResp = ComputeBalance | { error: string };

function isErr(x: unknown): x is { error: string } {
  return !!x && typeof x === 'object' && 'error' in (x as Record<string, unknown>);
}

export default function SystemStatus() {
  const [chain, setChain] = useState<ChainStatus | null>(null);
  const [compute, setCompute] = useState<ComputeResp | null>(null);
  const [txCount, setTxCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const [c, k, t] = await Promise.allSettled([
        api.chainStatus(),
        api.computeBalance(),
        api.listTransactions(),
      ]);
      if (!alive) return;
      if (c.status === 'fulfilled') setChain(c.value);
      if (k.status === 'fulfilled') setCompute(k.value);
      if (t.status === 'fulfilled') setTxCount(t.value.count);
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const computeReady = compute && !isErr(compute);

  return (
    <div className="orbit-card mb-8" style={{ padding: '1.5rem', background: 'var(--surface-container-low)' }}>
      <div className="label-md mb-4" style={{ letterSpacing: '0.1em' }}>SDK READINESS</div>
      <div className="flex gap-4">
        <Cell label="0G CHAIN" ok={!!chain} value={chain ? `BLOCK ${chain.blockNumber.toLocaleString()}` : '—'} sub={chain ? `chain ${chain.chainId}` : 'connecting'} />
        <Cell
          label="COMPUTE LEDGER"
          ok={!!computeReady && parseFloat((compute as ComputeBalance).balance) > 0}
          value={computeReady ? `${(compute as ComputeBalance).balance} 0G` : 'NO LEDGER'}
          sub={
            !computeReady ? 'fund via /api/compute/deposit'
              : parseFloat((compute as ComputeBalance).balance) > 0 ? 'inference ready' : 'top-up required'
          }
        />
        <Cell label="TX COUNT" ok={txCount !== null} value={txCount?.toString() ?? '—'} sub="ramp transactions" />
      </div>
    </div>
  );
}

function Cell({ label, value, sub, ok }: { label: string; value: string; sub: string; ok: boolean }) {
  return (
    <div style={{ flex: 1, padding: '1rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--rounded-sm)', border: `1px solid ${ok ? 'var(--tertiary)' : 'var(--outline-variant)'}` }}>
      <div className="label-sm mb-1" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? 'var(--tertiary)' : 'var(--on-surface-variant)' }}></span>
        {label}
      </div>
      <div style={{ fontSize: '1rem', fontFamily: 'monospace', color: 'var(--on-surface)' }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>{sub}</div>
    </div>
  );
}
