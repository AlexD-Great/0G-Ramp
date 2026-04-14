export type TransactionStatus = 'pending' | 'verifying' | 'settled' | 'failed';

export interface RampTransaction {
  id: string;
  userAddress: string;
  assetSymbol: string;
  amountIn: string;       // amount in (stablecoin or fiat)
  amountOut: string;      // amount out (after fees)
  feeAmount: string;
  sourceChain: string;
  destChain: string;
  txHashSource?: string;  // source chain tx hash
  txHash0G?: string;      // 0G chain settlement hash
  storageRootHash?: string; // 0G storage receipt root
  computeJobId?: string;  // 0G compute verification job ID
  status: TransactionStatus;
  createdAt: number;
  updatedAt: number;
}

export interface KYCRecord {
  userId: string;
  userAddress: string;
  fullName: string;
  documentHash: string;   // sha256 of the document bytes
  storageRootHash: string; // 0G storage merkle root
  verifiedAt: number;
  computeJobId: string;   // 0G compute job that ran the verification
}

export interface BridgeDeposit {
  depositId: string;
  fromAddress: string;
  toAddress: string;
  asset: string;
  amount: string;
  sourceChain: string;
  blockNumber: number;
  txHash: string;
  detectedAt: number;
}

export interface ComputeJobResult {
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
  computedAt?: number;
}
