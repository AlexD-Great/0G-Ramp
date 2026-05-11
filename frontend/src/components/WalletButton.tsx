'use client';
import { useState } from 'react';
import { connectWallet, disconnectWallet, useWallet } from '../lib/wallet';

export default function WalletButton() {
  const address = useWallet();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onClick = async () => {
    setErr(null);
    if (address) {
      disconnectWallet();
      return;
    }
    setBusy(true);
    try {
      await connectWallet();
    } catch (e) {
      const code = (e as { code?: number }).code;
      if (code === 4001) {
        setErr('Connection cancelled in wallet.');
      } else if (code === -32002) {
        setErr('Wallet already has a pending request. Open MetaMask to approve.');
      } else {
        setErr(`Connection failed: ${(e as Error).message || 'unknown error'}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const label = busy
    ? 'CONNECTING…'
    : address
      ? `${address.slice(0, 6)}…${address.slice(-4)}`
      : 'CONNECT WALLET';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
      <button
        onClick={onClick}
        className="btn btn-primary"
        title={address ? 'Click to disconnect' : 'Connect MetaMask'}
        style={{ padding: '0.5rem 1.5rem', fontSize: '0.75rem', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}
      >
        {label}
      </button>
      {err && (
        <div style={{ fontSize: '0.6rem', color: '#ff6b6b', maxWidth: 180, textAlign: 'right' }}>{err}</div>
      )}
    </div>
  );
}
