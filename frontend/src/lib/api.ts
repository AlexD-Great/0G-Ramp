import { getFirebaseAuth } from './firebase';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';
const FETCH_TIMEOUT_MS = 15000;

async function authHeader(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') return {};
  try {
    const u = getFirebaseAuth().currentUser;
    if (!u) return {};
    const token = await u.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

async function req<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((init?.headers as Record<string, string>) ?? {}),
    };
    if (init?.auth) Object.assign(headers, await authHeader());

    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      let body: unknown;
      try { body = await res.json(); } catch { body = await res.text(); }
      const err = new Error(`${res.status} ${res.statusText}: ${JSON.stringify(body)}`) as Error & { status?: number; body?: unknown };
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return res.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError) {
      if (error.message.includes('AbortError')) {
        throw new Error('Backend request timeout. Check if backend is running at ' + BASE);
      }
      throw new Error('Backend offline or unreachable at ' + BASE + '. ' + error.message);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export type Health = { status: string; service: string; network: string; chainId: number; timestamp: number };

export type ChainStatus = {
  ok: boolean;
  chainId: number;
  name: string;
  blockNumber: number;
  rpc: string;
  explorer: string;
};

export type WalletStatus = {
  address: string;
  nativeBalance: string;
  unit: string;
  gasHealthy: boolean;
};

export type ComputeBalance = { balance: string; unit: string };

export type RampTx = {
  id: string;
  userAddress: string;
  assetSymbol: string;
  amountIn: string;
  amountOut: string;
  feeAmount: string;
  sourceChain: string;
  destChain: string;
  status: string;
  txHash0G?: string;
  storageRootHash?: string;
  computeJobId?: string;
  createdAt: number;
  updatedAt: number;
};

// Redacted public ledger row — server hides PII (settlement hashes, full wallet, compute IDs).
export type PublicRampTx = {
  id: string;
  userAddressMasked: string;
  assetSymbol: string;
  amountIn: string;
  amountOut: string;
  feeAmount: string;
  sourceChain: string;
  destChain: string;
  status: string;
  createdAt: number;
  updatedAt: number;
};

export type InitiateInput = {
  assetSymbol: string;
  amountIn: string;
  sourceChain: string;
  destChain: string;
};

export type KycStatusValue = 'none' | 'submitted' | 'verifying' | 'verified' | 'rejected';

export type StartKycResponse = {
  ok: boolean;
  url: string;
  sessionId: string;
};

export type MyKycStatus = {
  walletAddress: string;
  kycStatus: KycStatusValue;
  kycSubmittedAt: number | null;
  kycVerifiedAt: number | null;
  kycStripeSessionId: string | null;
  kycRejectReason: string | null;
  fullName: string | null;
};

export type Quote = { amountUsd: number; amount0G: string; rate: number };

export type CheckoutSessionResponse = {
  ok: boolean;
  url: string;
  sessionId: string;
  txId: string;
  amountUsd: number;
  amount0G: string;
  rate: number;
};

export type Treasury = { contract: string; balance: string; unit: string };

export const api = {
  health: () => req<Health>('/health'),
  chainStatus: () => req<ChainStatus>('/api/chain/status'),
  walletStatus: () => req<WalletStatus | { error: string }>('/api/chain/wallet'),
  nativeBalance: (address: string) =>
    req<{ address: string; balance: string; unit: string }>(`/api/chain/balance/${address}`),
  computeBalance: () => req<ComputeBalance | { error: string }>('/api/compute/balance'),
  listTransactions: () => req<{ transactions: PublicRampTx[]; count: number }>('/api/transactions'),
  myTransactions: () => req<{ transactions: RampTx[]; count: number }>('/api/transactions/mine', { auth: true }),
  initiateTransaction: (input: InitiateInput) =>
    req<{ ok: boolean; transaction: RampTx }>('/api/transactions/initiate', {
      method: 'POST',
      body: JSON.stringify(input),
      auth: true,
    }),
  startKyc: () =>
    req<StartKycResponse>('/api/kyc/start', {
      method: 'POST',
      auth: true,
    }),
  myKyc: () => req<MyKycStatus>('/api/kyc/me', { auth: true }),
  quote: (amountUsd: number) => req<Quote>(`/api/payments/quote/${amountUsd}`),
  createCheckoutSession: (amountUsd: number) =>
    req<CheckoutSessionResponse>('/api/payments/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ amountUsd }),
      auth: true,
    }),
  treasury: () => req<Treasury>('/api/payments/treasury'),
  finalizeCheckout: (sessionId: string, txId: string) =>
    req<{ ok: boolean; transaction: RampTx }>('/api/payments/finalize', {
      method: 'POST',
      body: JSON.stringify({ sessionId, txId }),
      auth: true,
    }),
  getTransaction: (id: string) =>
    req<{ transaction: RampTx; computeResult: { result?: Record<string, unknown> | { raw: string } } | null }>(
      `/api/transactions/${id}`,
    ),
};
