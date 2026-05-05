'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signInWithCustomToken, signOut, type User } from 'firebase/auth';
import { BrowserProvider } from 'ethers';
import { getFirebaseAuth } from './firebase';
import { connectWallet } from './wallet';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

export type AuthState = {
  user: User | null;
  walletAddress: string | null;
  loading: boolean;
  signingIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let auth;
    try {
      auth = getFirebaseAuth();
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
      return;
    }
    const unsub = onIdTokenChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      // DEV ONLY — exposes the current ID token to the console for Postman testing.
      // Run `window.__idToken` in DevTools → Console to copy it.
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        (window as unknown as { __idToken?: string }).__idToken = u ? await u.getIdToken() : undefined;
      }
    });
    return () => unsub();
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    const u = getFirebaseAuth().currentUser;
    if (!u) return null;
    return u.getIdToken();
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    setSigningIn(true);
    try {
      // 1. Make sure we have a wallet connection
      const walletAddress = await connectWallet();

      // 2. Ask backend for a fresh nonce + the message to sign
      const nonceRes = await fetch(`${BASE}/api/auth/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });
      if (!nonceRes.ok) throw new Error(`Nonce request failed: ${nonceRes.status} ${await nonceRes.text()}`);
      const { message } = (await nonceRes.json()) as { nonce: string; message: string };

      // 3. Ask the wallet to sign the message
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No injected wallet available');
      }
      const provider = new BrowserProvider(window.ethereum as unknown as ConstructorParameters<typeof BrowserProvider>[0]);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      // 4. Exchange the signature for a Firebase custom token
      const verifyRes = await fetch(`${BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature }),
      });
      if (!verifyRes.ok) throw new Error(`Sign-in failed: ${verifyRes.status} ${await verifyRes.text()}`);
      const { customToken } = (await verifyRes.json()) as { customToken: string };

      // 5. Sign into Firebase Auth
      await signInWithCustomToken(getFirebaseAuth(), customToken);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(getFirebaseAuth());
  }, []);

  const walletAddress = user?.uid ? user.uid.toLowerCase() : null;

  return (
    <AuthContext.Provider value={{ user, walletAddress, loading, signingIn, error, signIn, signOutUser, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
