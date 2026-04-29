'use client';
import { useEffect, useState } from 'react';
import { api, type RampTx } from '../lib/api';
import { useWallet, connectWallet } from '../lib/wallet';
import { depositToBridge } from '../lib/bridge';

type Stage = 'idle' | 'creating' | 'awaiting-signature' | 'confirming' | 'done' | 'error';

export default function BridgeForm({ onCreated }: { onCreated?: (tx: RampTx) => void }) {
  const wallet = useWallet();
  const [userAddress, setUserAddress] = useState('');
  const [amountIn, setAmountIn] = useState('0.01');
  const [assetSymbol, setAssetSymbol] = useState('0G');
  const [sourceChain, setSourceChain] = useState('0G-Galileo');
  const [stage, setStage] = useState<Stage>('idle');
  const [last, setLast] = useState<RampTx | null>(null);
  const [onChainTx, setOnChainTx] = useState<{ txHash: string; explorerUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wallet && !userAddress) setUserAddress(wallet);
  }, [wallet, userAddress]);

  const onConnect = async () => {
    setError(null);
    try { await connectWallet(); }
    catch (e) { setError((e as Error).message); }
  };

  const submit = async () => {
    setError(null);
    setOnChainTx(null);
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      setError('Invalid 0x address');
      return;
    }
    if (parseFloat(amountIn) <= 0) {
      setError('Amount must be > 0');
      return;
    }

    try {
      setStage('creating');
      const { transaction } = await api.initiateTransaction({
        userAddress,
        assetSymbol,
        amountIn,
        sourceChain,
        destChain: '0G-Galileo',
      });
      setLast(transaction);
      onCreated?.(transaction);

      if (wallet && assetSymbol === '0G') {
        setStage('awaiting-signature');
        const result = await depositToBridge(amountIn, transaction.id);
        setStage('confirming');
        setOnChainTx(result);
      }

      setStage('done');
    } catch (e) {
      setError((e as Error).message);
      setStage('error');
    }
  };

  const busy = stage === 'creating' || stage === 'awaiting-signature' || stage === 'confirming';
  const buttonLabel = stage === 'creating' ? 'CREATING TX RECORD…'
    : stage === 'awaiting-signature' ? 'AWAITING WALLET SIGNATURE…'
    : stage === 'confirming' ? 'CONFIRMING ON-CHAIN…'
    : 'CONFIRM TRANSACTION PAYLOAD';

  return (
    <div className="orbit-card mt-4 flex-col justify-between" style={{ background: 'var(--surface-container-low)' }}>
      {!wallet && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--rounded-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            Connect wallet to send a real on-chain deposit. Off-chain record-only otherwise.
          </div>
          <button onClick={onConnect} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.7rem' }}>CONNECT</button>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <div style={{ flex: 2 }}>
          <div className="label-sm mb-1">USER ADDRESS</div>
          <input
            value={userAddress}
            onChange={(e) => setUserAddress(e.target.value)}
            placeholder="0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
            style={{ width: '100%', padding: '0.75rem', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--rounded-sm)', color: 'var(--on-surface)', fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label-sm mb-1">AMOUNT</div>
          <input
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--rounded-sm)', color: 'var(--on-surface)', fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label-sm mb-1">ASSET</div>
          <select
            value={assetSymbol}
            onChange={(e) => setAssetSymbol(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--rounded-sm)', color: 'var(--on-surface)', fontFamily: 'monospace', fontSize: '0.875rem' }}
          >
            <option value="0G">0G</option>
            <option value="USDT">USDT</option>
            <option value="USDC">USDC</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div className="label-sm mb-1">SOURCE</div>
          <input
            value={sourceChain}
            onChange={(e) => setSourceChain(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--rounded-sm)', color: 'var(--on-surface)', fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      <div className="flex justify-between mb-6">
        <div>
          <div className="label-sm mb-1">ESTIMATED COMPLETION</div>
          <div className="display-sm text-gradient-purple">~45 SECONDS</div>
        </div>
        <div className="text-right">
          <div className="label-sm mb-1">VERIFICATION FEE</div>
          <div className="display-sm">0.5%</div>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={busy}
        className="btn btn-primary w-full display-sm"
        style={{ padding: '1rem', letterSpacing: '0.4em', opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}
      >
        {buttonLabel}
      </button>

      {error && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: 'var(--rounded-sm)', fontSize: '0.75rem', color: '#ff6b6b', fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {error}
        </div>
      )}

      {last && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--rounded-sm)', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--tertiary)' }}>
          ✓ TX {last.id.slice(0, 8)}… status={last.status}
        </div>
      )}

      {onChainTx && (
        <a
          href={onChainTx.explorerUrl}
          target="_blank"
          rel="noreferrer"
          style={{ marginTop: '0.5rem', display: 'block', padding: '0.75rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--rounded-sm)', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--primary)', textDecoration: 'none', wordBreak: 'break-all' }}
        >
          ↗ ON-CHAIN: {onChainTx.txHash}
        </a>
      )}
    </div>
  );
}
