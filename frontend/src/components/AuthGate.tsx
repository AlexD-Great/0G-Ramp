'use client';
import type { ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import SignInButton from './SignInButton';

/**
 * Renders children only if the user is signed in. Otherwise shows a sign-in
 * prompt. Use to gate /dashboard, /buy, /kyc.
 */
export default function AuthGate({ children, message }: { children: ReactNode; message?: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.8rem' }}>
        Loading session…
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '4rem 2rem', maxWidth: '520px', margin: '0 auto' }}>
        <div className="orbit-card ghost-border" style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--surface-container-low)' }}>
          <div className="label-sm text-gradient-purple mb-2">SESSION REQUIRED</div>
          <h2 className="display-sm mb-4">Sign in to continue</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {message ?? 'Sign a message with your wallet to access this area. No transaction is sent — proof of wallet control only.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SignInButton />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
