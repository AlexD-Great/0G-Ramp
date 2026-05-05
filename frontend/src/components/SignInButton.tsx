'use client';
import { useAuth } from '../lib/auth';

export default function SignInButton() {
  const { user, walletAddress, signingIn, error, signIn, signOutUser, loading } = useAuth();

  const onClick = async () => {
    if (user) { await signOutUser(); return; }
    try { await signIn(); } catch { /* surfaced via context error */ }
  };

  const label = loading
    ? 'LOADING…'
    : signingIn
      ? 'SIGN MESSAGE IN WALLET…'
      : walletAddress
        ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
        : 'SIGN IN WITH WALLET';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
      <button
        onClick={onClick}
        disabled={signingIn || loading}
        className="btn btn-primary"
        title={user ? 'Click to sign out' : 'Sign in by signing a message with your wallet'}
        style={{ padding: '0.5rem 1.5rem', fontSize: '0.75rem', cursor: signingIn ? 'wait' : 'pointer', opacity: signingIn || loading ? 0.6 : 1 }}
      >
        {label}
      </button>
      {error && (
        <div style={{ fontSize: '0.6rem', color: '#ff6b6b', maxWidth: 220, textAlign: 'right' }}>{error}</div>
      )}
    </div>
  );
}
