'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TopNav from '../../components/TopNav';
import Sidebar from '../../components/Sidebar';
import AuthGate from '../../components/AuthGate';
import { api, type MyKycStatus, type Quote, type RampTx, type Treasury } from '../../lib/api';
import { useAuth } from '../../lib/auth';

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://chainscan-galileo.0g.ai';
type Stage = 'idle' | 'redirecting' | 'verifying' | 'paying-out' | 'anchoring' | 'settled' | 'failed' | 'cancelled';

export default function BuyPage() {
  return (
    <>
      <TopNav brand="OG RAMP CORE" active="BRIDGE" />
      <div className="flex" style={{ height: 'calc(100vh - 72px)' }}>
        <Sidebar />
        <div className="page-content flex flex-col gap-8" style={{ padding: '2rem 3rem', maxWidth: '1100px', flex: 1, overflowY: 'auto' }}>
          <AuthGate message="Sign in with your wallet to access the on-ramp.">
            <Suspense fallback={null}>
              <BuyPageInner />
            </Suspense>
          </AuthGate>
        </div>
      </div>
    </>
  );
}

function BuyPageInner() {
  const { walletAddress } = useAuth();
  const search = useSearchParams();
  const router = useRouter();
  const [amountUsd, setAmountUsd] = useState('5');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [tx, setTx] = useState<RampTx | null>(null);
  // True once the backend has confirmed `tx` exists for the current user.
  // Until then, `tx` is just a UI placeholder and we must NOT poll (the poll
  // would race the search-effect load and could surface a transient 404).
  const [txConfirmed, setTxConfirmed] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kyc, setKyc] = useState<MyKycStatus | null>(null);

  // Poll KYC status — required before checkout
  useEffect(() => {
    let alive = true;
    const tick = () => api.myKyc().then((k) => { if (alive) setKyc(k); }).catch(() => {});
    tick();
    const id = setInterval(tick, 6000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Fetch quote whenever USD amount changes
  useEffect(() => {
    const usd = parseFloat(amountUsd);
    if (Number.isNaN(usd) || usd <= 0) { setQuote(null); return; }
    let alive = true;
    api.quote(usd).then((q) => { if (alive) setQuote(q); }).catch(() => {});
    return () => { alive = false; };
  }, [amountUsd]);

  // Treasury balance
  useEffect(() => {
    let alive = true;
    const tick = () => api.treasury().then((t) => { if (alive) setTreasury(t); }).catch(() => {});
    tick();
    const id = setInterval(tick, 8000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Reset all per-tx UI state when the signed-in wallet changes — otherwise a
  // stale pipeline from the previous account could linger after sign-out/in.
  useEffect(() => {
    setTx(null);
    setTxConfirmed(false);
    setStage('idle');
    setError(null);
    setBusy(false);
  }, [walletAddress]);

  // Resume from Stripe redirect (?txId=...&status=success|cancelled).
  // We strip the params from the URL after consuming them so a refresh,
  // back-button navigation, or wallet switch can't resurrect a stale tx
  // from a previous session.
  useEffect(() => {
    const txId = search.get('txId');
    const status = search.get('status');
    const sessionId = search.get('session_id');
    if (!txId || !walletAddress) return;
    // Wait until the user is signed in so the auth header is sent — otherwise
    // the backend returns 401 and we'd render an empty placeholder pipeline.

    const clearParams = () => router.replace('/buy');
    const onLoadFailure = (msg: string) => {
      setTx(null);
      setTxConfirmed(false);
      setStage('idle');
      setError(msg);
      clearParams();
    };

    if (status === 'cancelled') {
      setStage('cancelled');
      setTx({ id: txId, userAddress: walletAddress, assetSymbol: '0G', amountIn: '0', amountOut: '0', feeAmount: '0', sourceChain: 'STRIPE-USD', destChain: '0G-Galileo', status: 'cancelled', createdAt: Date.now(), updatedAt: Date.now() });
      api.getTransaction(txId)
        .then(({ transaction }) => { setTx(transaction); setTxConfirmed(true); clearParams(); })
        .catch(() => clearParams());
      return;
    }

    if (status === 'success') {
      setStage('verifying');
      setTx((prev) => prev ?? { id: txId, userAddress: walletAddress, assetSymbol: '0G', amountIn: '—', amountOut: '—', feeAmount: '0', sourceChain: 'STRIPE-USD', destChain: '0G-Galileo', status: 'pending', createdAt: Date.now(), updatedAt: Date.now() });

      const load = sessionId
        ? api.finalizeCheckout(sessionId, txId).then((r) => r.transaction).catch(() =>
            api.getTransaction(txId).then((r) => r.transaction))
        : api.getTransaction(txId).then((r) => r.transaction);

      load
        .then((transaction) => { setTx(transaction); setTxConfirmed(true); clearParams(); })
        .catch((err) => onLoadFailure((err as Error).message || 'Could not load this transaction. It may belong to a different wallet.'));
    }
  }, [search, walletAddress, router]);

  // Keep `stage` in sync with whatever `tx` looks like. Runs on every setTx
  // (search-effect placeholder, finalize response, getTransaction response,
  // poll tick), so the UI reflects the real tx state regardless of who wrote
  // it. Critical: if the tx is already settled when we first load it (webhook
  // completed before the user returned, or pipeline ran faster than the poll
  // interval), the polling effect below would early-return and stage would
  // be stuck at 'verifying' forever without this.
  useEffect(() => {
    if (!tx) return;
    if (stage === 'cancelled' || stage === 'redirecting' || stage === 'idle') return;
    if (tx.status === 'settled') setStage('settled');
    else if (tx.status === 'failed') setStage('failed');
    else if (tx.txHash0G) setStage('anchoring');
    else if (tx.computeJobId) setStage('paying-out');
    else setStage('verifying');
  }, [tx, stage]);

  // Poll the ramp tx until it reaches a terminal state.
  // Gated on txConfirmed so we never poll a UI placeholder — that would race
  // the search-effect load and surface transient backend errors as a hard
  // failure shown to every user post-payment.
  useEffect(() => {
    if (!txConfirmed || !tx || tx.status === 'settled' || tx.status === 'failed') return;
    if (stage === 'cancelled') return;
    let alive = true;
    const tick = async () => {
      try {
        const { transaction } = await api.getTransaction(tx.id);
        if (!alive) return;
        setTx(transaction);
      } catch { /* transient — keep polling, never eject the user */ }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [tx, stage, txConfirmed]);

  const onBuyClick = async () => {
    setError(null);
    const usd = parseFloat(amountUsd);
    if (Number.isNaN(usd) || usd < 1) { setError('Amount must be at least $1'); return; }
    if (kyc?.kycStatus !== 'verified') { setError('Complete KYC verification before purchasing.'); return; }

    setBusy(true);
    setStage('redirecting');
    try {
      const { url } = await api.createCheckoutSession(usd);
      if (!url) throw new Error('Stripe did not return a checkout URL');
      window.location.href = url;
    } catch (err) {
      setError((err as Error).message);
      setStage('idle');
      setBusy(false);
    }
  };

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

  const reset = () => {
    setTx(null);
    setTxConfirmed(false);
    setStage('idle');
    setError(null);
    setBusy(false);
    router.replace('/buy');
  };

  const treasuryLow = !!treasury && parseFloat(treasury.balance) < 0.05;
  const verified = kyc?.kycStatus === 'verified';
  const canSubmit = !!quote && !treasuryLow && !busy && verified;

  return (
    <>
      <div className="flex justify-between items-end stack-on-mobile gap-4">
        <div>
          <div className="label-sm text-gradient-purple mb-2">SOVEREIGN ON-RAMP</div>
          <h1 className="display-md">BUY 0G TOKENS</h1>
          <div className="label-sm mt-2">Pay USD via Stripe → AI verifies → custodial payout → receipt anchored to 0G Storage.</div>
        </div>
        {treasury && (
          <div className="orbit-card ghost-border" style={{ padding: '1rem', minWidth: '220px' }}>
            <div className="label-sm mb-1">TREASURY POOL</div>
            <div className="display-sm" style={{ color: treasuryLow ? '#ff6b6b' : 'var(--primary)' }}>{parseFloat(treasury.balance).toFixed(4)} 0G</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
              {treasury.contract.slice(0, 10)}…{treasury.contract.slice(-6)}
            </div>
          </div>
        )}
      </div>

      {!tx ? (
        <div className="orbit-card ghost-border" style={{ padding: '2.5rem', background: 'var(--surface-container-low)' }}>
          <h2 className="label-md mb-6" style={{ letterSpacing: '0.15em' }}>ORDER</h2>

          {kyc && !verified && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255, 200, 100, 0.08)', border: '1px solid var(--tertiary)', borderRadius: 'var(--rounded-sm)' }}>
              <div className="label-sm mb-1" style={{ color: 'var(--tertiary)' }}>KYC REQUIRED</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>
                Complete identity verification before purchasing. Status: <strong>{kyc.kycStatus.toUpperCase()}</strong>.
              </div>
              <Link href="/kyc" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', display: 'inline-block' }}>
                {kyc.kycStatus === 'none' ? 'START KYC' : 'VIEW KYC'}
              </Link>
            </div>
          )}

          <div className="flex gap-4 items-end stack-on-mobile">
            <div style={{ flex: 1 }}>
              <div className="label-sm mb-2">YOU PAY (USD)</div>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--rounded-sm)', padding: '0.5rem 1rem' }}>
                <span style={{ fontSize: '1.5rem', color: 'var(--on-surface-variant)', marginRight: '0.5rem' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(e.target.value)}
                  style={{ flex: 1, fontSize: '1.5rem', background: 'transparent', border: 'none', outline: 'none', color: 'var(--on-surface)', fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div style={{ width: '32px', textAlign: 'center', fontSize: '1.5rem', color: 'var(--on-surface-variant)', paddingBottom: '0.75rem' }}>→</div>

            <div style={{ flex: 1 }}>
              <div className="label-sm mb-2">YOU RECEIVE</div>
              <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--tertiary)', borderRadius: 'var(--rounded-sm)', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.5rem', color: 'var(--on-surface)', fontFamily: 'monospace' }}>{quote?.amount0G ?? '—'}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--tertiary)', letterSpacing: '0.1em' }}>0G</span>
              </div>
            </div>
          </div>

          {quote && (
            <div className="flex justify-between mt-4" style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>
              <div>RATE: {quote.rate} USD / 0G</div>
              <div>VERIFICATION FEE: 0.5% applied at settlement</div>
            </div>
          )}

          <div className="mt-8" style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '1.5rem' }}>
            <div className="label-sm mb-2">DESTINATION WALLET</div>
            <div className="orbit-card ghost-border" style={{ padding: '1rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--on-surface)' }}>
                {walletAddress}
              </div>
            </div>
          </div>

          {treasuryLow && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: 'var(--rounded-sm)', fontSize: '0.75rem', color: '#ff6b6b' }}>
              Treasury balance is low. Top up the OGRampPayout contract before initiating large purchases.
            </div>
          )}

          <button
            onClick={onBuyClick}
            disabled={!canSubmit}
            className="btn btn-primary w-full mt-6 display-sm"
            style={{ padding: '1rem', letterSpacing: '0.3em', cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.5 }}
          >
            {busy ? 'REDIRECTING TO STRIPE…' : !verified ? 'KYC REQUIRED' : 'PAY WITH STRIPE'}
          </button>

          {error && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: 'var(--rounded-sm)', fontSize: '0.75rem', color: '#ff6b6b', fontFamily: 'monospace' }}>
              {error}
            </div>
          )}
        </div>
      ) : (
        <PipelineView tx={tx} stage={stage} onDownload={downloadReceipt} onReset={reset} />
      )}
    </>
  );
}

function PipelineView({ tx, stage, onDownload, onReset }: { tx: RampTx; stage: Stage; onDownload: () => void; onReset: () => void }) {
  const shortHash = (h?: string) => (h && h.length > 14 ? `${h.slice(0, 10)}…${h.slice(-6)}` : h ?? '');
  const settled = tx.status === 'settled';
  // Step done-state is derived from the actual tx fields, not from `stage`.
  // PAYMENT VERIFIED is always done once we render this view (we only got here
  // via Stripe success redirect or because the tx already exists).
  const steps: { label: string; description: string; done: boolean; live: React.ReactNode }[] = [
    {
      label: 'PAYMENT VERIFIED',
      description: 'Stripe payment captured · ramp tx created',
      done: true,
      live: <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--on-surface)' }}>tx {tx.id.slice(0, 8)}…</span>,
    },
    {
      label: '0G COMPUTE RISK SCAN',
      description: 'AI scoring tx for AML / fraud signals',
      done: !!tx.computeJobId,
      live: tx.computeJobId
        ? <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--tertiary)' }}>job {tx.computeJobId}</span>
        : <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>submitting risk job…</span>,
    },
    {
      label: 'ON-CHAIN PAYOUT',
      description: 'OGRampPayout contract sending 0G to your wallet',
      done: !!tx.txHash0G,
      live: tx.txHash0G
        ? <a href={`${EXPLORER}/tx/${tx.txHash0G}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--tertiary)' }}>{shortHash(tx.txHash0G)} ↗</a>
        : tx.computeJobId
          ? <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>broadcasting payout…</span>
          : null,
    },
    {
      label: '0G STORAGE ANCHOR',
      description: 'Tamper-proof receipt anchored on 0G',
      done: !!tx.storageRootHash || settled,
      live: tx.storageRootHash
        ? <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--tertiary)' }}>root {shortHash(tx.storageRootHash)}</span>
        : tx.txHash0G
          ? <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>anchoring receipt…</span>
          : null,
    },
  ];

  // First not-done step is "active" (in-progress). Everything before it is done.
  const activeIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="orbit-card ghost-border" style={{ padding: '2.5rem', background: 'var(--surface-container-low)' }}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="label-sm text-gradient-purple">RAMP TX {tx.id.slice(0, 8).toUpperCase()}</div>
          <h2 className="display-sm mt-1">${tx.amountIn} → {tx.amountOut} 0G</h2>
        </div>
        <div className="text-right">
          <div className="label-sm">STATUS</div>
          <div className="display-sm" style={{ color: stage === 'settled' ? 'var(--primary)' : stage === 'failed' || stage === 'cancelled' ? '#ff6b6b' : 'var(--tertiary)', textTransform: 'uppercase' }}>
            {stage}
          </div>
        </div>
      </div>

      {stage !== 'cancelled' && (
        <div className="flex flex-col gap-2">
          {steps.map((s, i) => {
            const done = s.done;
            const active = !done && (activeIdx === -1 ? false : i === activeIdx) && stage !== 'failed';
            const failed = stage === 'failed' && i === activeIdx;
            const color = failed ? '#ff6b6b' : done ? 'var(--primary)' : active ? 'var(--tertiary)' : 'var(--on-surface-variant)';
            return (
              <div key={s.label} className="orbit-card ghost-border flex items-center gap-4" style={{ padding: '1rem', background: 'var(--surface-container-lowest)', opacity: done || active || failed ? 1 : 0.4 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {done && !failed ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--on-primary-fixed)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : active ? (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--on-primary-fixed)', animation: 'pulse 1.2s ease-in-out infinite' }} />
                  ) : failed ? (
                    <span style={{ color: 'var(--on-primary-fixed)', fontWeight: 700 }}>×</span>
                  ) : (
                    <span style={{ color: 'var(--on-primary-fixed)', fontSize: '0.7rem' }}>{i + 1}</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="label-md" style={{ color }}>{s.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>{s.description}</div>
                  {s.live && <div style={{ marginTop: '0.35rem' }}>{s.live}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {stage === 'settled' && (
        <div className="orbit-card mt-6" style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--primary)' }}>
          <div className="label-sm mb-3 text-gradient">SETTLEMENT EVIDENCE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.75rem 1rem', fontSize: '0.75rem' }}>
            <div className="label-sm">PAYOUT TX</div>
            <a href={`${EXPLORER}/tx/${tx.txHash0G}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', color: 'var(--tertiary)', wordBreak: 'break-all' }}>
              {tx.txHash0G}
            </a>
            <div className="label-sm">STORAGE ROOT</div>
            <span style={{ fontFamily: 'monospace', color: tx.storageRootHash ? 'var(--on-surface)' : 'var(--on-surface-variant)', wordBreak: 'break-all' }}>
              {tx.storageRootHash ?? '—  (anchor pending or storage indexer down)'}
            </span>
            <div className="label-sm">NET 0G</div>
            <span style={{ fontFamily: 'monospace' }}>{tx.amountOut}</span>
            <div className="label-sm">FEE</div>
            <span style={{ fontFamily: 'monospace' }}>{tx.feeAmount}</span>
          </div>
          <div className="flex gap-2 mt-4">
            <a href={`${EXPLORER}/tx/${tx.txHash0G}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ flex: 1, textAlign: 'center', padding: '0.75rem' }}>VIEW ON EXPLORER</a>
            <button onClick={onDownload} className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem' }}>DOWNLOAD RECEIPT</button>
            <button onClick={onReset} className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem' }}>BUY MORE</button>
          </div>
        </div>
      )}

      {stage === 'failed' && (
        <div className="orbit-card mt-6" style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid #ff6b6b' }}>
          <div className="label-sm mb-2" style={{ color: '#ff6b6b' }}>RAMP FAILED</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
            The pipeline blocked this transaction. Common causes: high AI risk score, treasury insufficient, or chain RPC error.
          </div>
          <button onClick={onReset} className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem' }}>TRY AGAIN</button>
        </div>
      )}

      {stage === 'cancelled' && (
        <div className="orbit-card mt-6" style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid #ff6b6b' }}>
          <div className="label-sm mb-2" style={{ color: '#ff6b6b' }}>CHECKOUT CANCELLED</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
            You closed the Stripe checkout before completing payment. No funds were captured.
          </div>
          <button onClick={onReset} className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem' }}>START OVER</button>
        </div>
      )}
    </div>
  );
}
