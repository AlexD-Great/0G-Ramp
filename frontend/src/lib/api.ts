const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text(); }
    throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(body)}`);
  }
  return res.json() as Promise<T>;
}

export type Health = {
  status: string;
  service: string;
  network: string;
  chainId: number;
  timestamp: number;
};

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

export type InitiateInput = {
  userAddress: string;
  assetSymbol: string;
  amountIn: string;
  sourceChain: string;
  destChain: string;
};

export type KycSubmitInput = {
  userId: string;
  userAddress: string;
  documentType: 'passport' | 'national_id' | 'drivers_license';
  documentBase64: string;
  fullName: string;
};

export type KycSubmitResponse = {
  ok: boolean;
  userId: string;
  documentHash: string;
  storageRootHash: string;
  computeJobId: string;
  message: string;
};

export type KycStatus = {
  userId: string;
  userAddress: string;
  documentHash: string;
  storageRootHash: string;
  computeJobId: string;
  computeStatus: string;
  computeResult: Record<string, unknown> | null;
  verified: boolean;
  verifiedAt: number | null;
};

export const api = {
  health: () => req<Health>('/health'),
  chainStatus: () => req<ChainStatus>('/api/chain/status'),
  walletStatus: () => req<WalletStatus | { error: string }>('/api/chain/wallet'),
  nativeBalance: (address: string) =>
    req<{ address: string; balance: string; unit: string }>(`/api/chain/balance/${address}`),
  computeBalance: () => req<ComputeBalance | { error: string }>('/api/compute/balance'),
  listTransactions: () => req<{ transactions: RampTx[]; count: number }>('/api/transactions'),
  initiateTransaction: (input: InitiateInput) =>
    req<{ ok: boolean; transaction: RampTx }>('/api/transactions/initiate', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  submitKyc: (input: KycSubmitInput) =>
    req<KycSubmitResponse>('/api/kyc/submit', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  kycStatus: (userId: string) => req<KycStatus>(`/api/kyc/status/${userId}`),
};
