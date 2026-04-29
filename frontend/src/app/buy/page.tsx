'use client';
import { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav';
import Sidebar from '../../components/Sidebar';
import StripeCheckout from '../../components/StripeCheckout';
import { api, type Quote, type RampTx, type Treasury } from '../../lib/api';
import { useWallet, connectWallet } from '../../lib/wallet';

const EXPLORER = 'https://chainscan-galileo.0g.ai';
type Stage = 'idle' | 'checkout-open' | 'verifying' | 'paying-out' | 'anchoring' | 'settled' | 'failed';

export default function BuyPage() {
  const wallet = useWallet();
  const [amountUsd, setAmountUsd] = useState('5');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [tx, setTx] = useState<RampTx | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);

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

  // Poll the ramp tx once submitted
  useEffect(() => {
    if (!tx || tx.status === 'settled' || tx.status === 'failed') return;
    let alive = true;
    const tick = async () => {
      try {
        const { transaction } = await api.getTransaction(tx.id);
        if (!alive) return;
        setTx(transaction);
        if (transaction.status === 'settled') setStage('settled');
        else if (transaction.status === 'failed') setStage('failed');
        else if (transaction.txHash0G) setStage('anchoring');
        else if (transaction.computeJobId) setStage('paying-out');
        else setStage('verifying');
      } catch { /* ignore */ }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [tx]);

  const onBuyClick = async () => {
    setError(null);
    if (!wallet) {
      try { await connectWallet(); }
      catch (e) { setError((e as Error).message); return; }
      return;
    }
    setShowCheckout(true);
  };

  const onPay = async () => {
    if (!wallet) throw new Error('Connect wallet first');
    const usd = parseFloat(amountUsd);
    if (Number.isNaN(usd) || usd < 1) throw new Error('Amount must be at least $1');
    
    try {
      const checkout = await api.checkout(wallet, usd);
      setTx(checkout.transaction);
      setStage('verifying');
      
      // Keep modal open during confirmation
      try {
        await api.confirmPayment(checkout.paymentIntentId);
      } catch (confirmErr) {
        // Mark transaction as failed if confirmation fails
        setTx(prev => prev ? { ...prev, status: 'failed' } : null);
        setStage('failed');
        throw confirmErr;
      }
      
      // Only close modal after successful confirmation
      setShowCheckout(false);
    } catch (err) {
      throw err;
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
    setStage('idle');
    setError(null);
  };

  const treasuryLow = !!treasury && parseFloat(treasury.balance) < 0.05;

  return (
    <>
      <TopNav brand="OG RAMP CORE" active="BRIDGE" />
      <div className="flex" style={{ height: 'calc(100vh - 72px)' }}>
        <Sidebar />
        <div className="page-content flex flex-col gap-8" style={{ padding: '2rem 3rem', maxWidth: '1100px' }}>

          <div className="flex justify-between items-end">
            <div>
              <div className="label-sm text-gradient-purple mb-2">SOVEREIGN ON-RAMP</div>
              <h1 className="display-md">BUY 0G TOKENS</h1>
              <div className="label-sm mt-2">Pay USD via simulated Stripe → AI verifies → custodial payout → receipt anchored to 0G Storage.</div>
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

              <div className="flex gap-4 items-end">
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
                <div className="orbit-card ghost-border" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: wallet ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>
                    {wallet ?? 'Wallet not connected'}
                  </div>
                  {!wallet && (
                    <button onClick={() => connectWallet().catch((e) => setError((e as Error).message))} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.7rem' }}>CONNECT</button>
                  )}
                </div>
              </div>

              {treasuryLow && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: 'var(--rounded-sm)', fontSize: '0.75rem', color: '#ff6b6b' }}>
                  Treasury balance is low. Top up the OGRampPayout contract before initiating large purchases.
                </div>
              )}

              <button
                onClick={onBuyClick}
                disabled={!quote || treasuryLow}
                className="btn btn-primary w-full mt-6 display-sm"
                style={{ padding: '1rem', letterSpacing: '0.3em', cursor: quote && !treasuryLow ? 'pointer' : 'not-allowed', opacity: quote && !treasuryLow ? 1 : 0.5 }}
              >
                {wallet ? 'PROCEED TO PAYMENT' : 'CONNECT WALLET TO CONTINUE'}
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

        </div>
      </div>

      {showCheckout && quote && (
        <StripeCheckout
          amountUsd={parseFloat(amountUsd)}
          amount0G={quote.amount0G}
          onPay={onPay}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}

function PipelineView({ tx, stage, onDownload, onReset }: { tx: RampTx; stage: Stage; onDownload: () => void; onReset: () => void }) {
  const steps: { key: Stage; label: string; description: string }[] = [
    { key: 'verifying', label: 'PAYMENT VERIFIED', description: 'Stripe payment captured · ramp tx created' },
    { key: 'paying-out', label: '0G COMPUTE RISK SCAN', description: 'AI scoring tx for AML / fraud signals' },
    { key: 'anchoring', label: 'ON-CHAIN PAYOUT', description: 'OGRampPayout contract sending 0G to your wallet' },
    { key: 'settled', label: '0G STORAGE ANCHOR', description: 'Tamper-proof receipt anchored on 0G' },
  ];

  const order: Stage[] = ['verifying', 'paying-out', 'anchoring', 'settled'];
  const currentIdx = order.indexOf(stage);

  return (
    <div className="orbit-card ghost-border" style={{ padding: '2.5rem', background: 'var(--surface-container-low)' }}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="label-sm text-gradient-purple">RAMP TX {tx.id.slice(0, 8).toUpperCase()}</div>
          <h2 className="display-sm mt-1">${tx.amountIn} → {tx.amountOut} 0G</h2>
        </div>
        <div className="text-right">
          <div className="label-sm">STATUS</div>
          <div className="display-sm" style={{ color: stage === 'settled' ? 'var(--primary)' : stage === 'failed' ? '#ff6b6b' : 'var(--tertiary)', textTransform: 'uppercase' }}>
            {stage}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {steps.map((s, i) => {
          const done = i < currentIdx || stage === 'settled';
          const active = i === currentIdx && stage !== 'settled' && stage !== 'failed';
          const failed = stage === 'failed' && i === currentIdx;
          const color = failed ? '#ff6b6b' : done ? 'var(--primary)' : active ? 'var(--tertiary)' : 'var(--on-surface-variant)';
          return (
            <div key={s.key} className="orbit-card ghost-border flex items-center gap-4" style={{ padding: '1rem', background: 'var(--surface-container-lowest)', opacity: done || active || failed ? 1 : 0.4 }}>
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
              </div>
            </div>
          );
        })}
      </div>

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
    </div>
  );
}
