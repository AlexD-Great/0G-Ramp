/**
 * server.ts – 0G Ramp Backend
 *
 * Express server that orchestrates:
 *   • 0G Chain   – on-chain tx, ERC-20 transfers, ledger reads
 *   • 0G Storage – immutable KYC / receipt anchoring
 *   • 0G Compute – AI-driven verification jobs
 *   • Bridge Watcher – detects cross-chain deposits → triggers payouts
 *
 * All 0G interactions target the Galileo Testnet (chain ID 16602).
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { bridgeWatcher, type PayoutEvent } from './services/bridgeWatcher';
import { ogChain } from './services/ogChain';
import { ogCompute } from './services/ogCompute';
import { ogStorage } from './services/ogStorage';
import { wallet } from './services/wallet';
import { txStore } from './services/store';
import { BridgeDeposit, RampTransaction } from './types';

// ─── Routes ──────────────────────────────────────────────────────────────────
import chainRoutes from './routes/chain';
import transactionRoutes from './routes/transactions';
import kycRoutes from './routes/kyc';
import computeRoutes from './routes/compute';
import storageRoutes from './routes/storage';
import paymentsRoutes, { stripeWebhookHandler } from './routes/payments';
import authRoutes from './routes/auth';

const app = express();

// ─── Security & parsing ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.server.frontendOrigin,
  credentials: true,
}));
app.use(morgan('dev'));

// Stripe webhook needs the raw body for signature verification, so it must be
// mounted BEFORE express.json() parses the body.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json({ limit: '10mb' })); // KYC documents can be large

// ─── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});
app.use(limiter);

// ─── Health / readiness ───────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: '0g-ramp-backend',
    network: '0G-Galileo-Testnet',
    chainId: config.ogChain.chainId,
    timestamp: Date.now(),
  });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/chain', chainRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/compute', computeRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/auth', authRoutes);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Settlement pipeline ──────────────────────────────────────────────────────

const RISK_WAIT_MS = 5_000;
const RISK_POLL_MS = 250;

/**
 * Wait briefly for the AI risk job to complete. If still running after the
 * timeout, we proceed (best-effort) — the operator can still block via
 * downstream review. Returns the result if completed, null otherwise.
 */
async function awaitRiskResult(jobId: string | undefined): Promise<Record<string, unknown> | null> {
  if (!jobId) return null;
  const deadline = Date.now() + RISK_WAIT_MS;
  while (Date.now() < deadline) {
    const r = ogCompute.getJobResult(jobId);
    if (r?.status === 'completed') return r.result ?? null;
    if (r?.status === 'failed') return null;
    await new Promise((res) => setTimeout(res, RISK_POLL_MS));
  }
  return null;
}

function isHighRisk(result: Record<string, unknown> | null): boolean {
  if (!result) return false;
  const level = String(result.riskLevel ?? '').toLowerCase();
  if (level === 'high') return true;
  const score = Number(result.riskScore);
  if (!Number.isNaN(score) && score >= 0.8) return true;
  return false;
}

/**
 * Called when the bridge watcher detects an on-chain Deposit event. Marks the
 * matched ramp tx as settled, anchors a tamper-proof receipt on 0G Storage,
 * and writes back the storage root + on-chain settlement tx hash.
 *
 * Native 0G deposits don't trigger an additional ERC-20 transfer (the deposit
 * tx itself is the on-chain settlement evidence). For ERC-20 ramps you'd add
 * a wallet.payout(...) call here that pays out the destination token.
 */
async function settleDeposit(event: PayoutEvent): Promise<void> {
  const { deposit, computeJobId, rampTx } = event;

  if (!rampTx) {
    console.log(`[Settle] Lone deposit ${deposit.depositId} – no matching ramp tx, anchoring receipt only`);
    try {
      const result = await ogStorage.storeReceipt({
        txId: deposit.depositId,
        userAddress: deposit.toAddress,
        asset: deposit.asset,
        amountIn: deposit.amount,
        amountOut: deposit.amount,
        feeAmount: '0',
        sourceChain: deposit.sourceChain,
        destChain: '0G-Galileo',
        settlementTxHash: deposit.txHash,
        settledAt: Date.now(),
      });
      bridgeWatcher.emit('receipt_stored', { deposit, storageRootHash: result.rootHash });
    } catch (err) {
      console.warn('[Settle] Lone-deposit receipt anchor failed:', err);
    }
    return;
  }

  console.log(`[Settle] Settling ramp tx ${rampTx.id} from on-chain deposit ${deposit.txHash}`);

  // Risk gate – block payout if AI flagged the tx as high-risk.
  const riskResult = await awaitRiskResult(rampTx.computeJobId);
  if (isHighRisk(riskResult)) {
    console.warn(`[Settle] BLOCKED ramp tx ${rampTx.id} – AI risk score: ${JSON.stringify(riskResult)}`);
    txStore.set(rampTx.id, {
      ...rampTx,
      txHash0G: deposit.txHash,
      status: 'failed',
      updatedAt: Date.now(),
    });
    return;
  }

  const { net, fee } = wallet.computeFee(deposit.amount);

  // Anchor receipt on 0G Storage – tamper-proof audit trail.
  let storageRootHash: string | undefined;
  try {
    const result = await ogStorage.storeReceipt({
      txId: rampTx.id,
      userAddress: rampTx.userAddress,
      asset: rampTx.assetSymbol,
      amountIn: deposit.amount,
      amountOut: net,
      feeAmount: fee,
      sourceChain: rampTx.sourceChain,
      destChain: rampTx.destChain,
      settlementTxHash: deposit.txHash,
      settledAt: Date.now(),
    });
    storageRootHash = result.rootHash;
    bridgeWatcher.emit('receipt_stored', { deposit, storageRootHash });
    console.log(`[Settle] Storage receipt anchored: ${storageRootHash}`);
  } catch (err) {
    console.warn('[Settle] Storage anchor failed (non-fatal):', err);
  }

  const settled: RampTransaction = {
    ...rampTx,
    amountIn: deposit.amount,
    amountOut: net,
    feeAmount: fee,
    txHash0G: deposit.txHash,
    storageRootHash,
    computeJobId: rampTx.computeJobId ?? computeJobId,
    status: 'settled',
    updatedAt: Date.now(),
  };
  txStore.set(rampTx.id, settled);
  console.log(`[Settle] Ramp tx ${rampTx.id} → settled (net ${net} ${rampTx.assetSymbol})`);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot(): Promise<void> {
  // 1. Verify 0G Chain connectivity
  try {
    const block = await ogChain.getBlockNumber();
    console.log(`[Boot] 0G Chain connected. Block: ${block}`);
  } catch (err) {
    console.warn('[Boot] 0G Chain not reachable – continuing anyway:', err);
  }

  // 2. Check hot wallet gas balance
  if (config.hotWallet.privateKey) {
    try {
      await wallet.checkGasHealth();
      console.log(`[Boot] Hot wallet: ${wallet.getAddress()}`);
    } catch (err) {
      console.warn('[Boot] Hot wallet check failed:', err);
    }
  }

  // 3. Wire up bridge watcher events
  bridgeWatcher.on('deposit', (deposit: BridgeDeposit) => {
    console.log(`[Boot] Bridge deposit detected: ${deposit.depositId} – ${deposit.amount} ${deposit.asset}`);
  });

  bridgeWatcher.on('payout_required', async (event: PayoutEvent) => {
    await settleDeposit(event).catch((err) =>
      console.error(`[Boot] Settlement failed for ${event.deposit.depositId}:`, err),
    );
  });

  bridgeWatcher.on('receipt_stored', (event: { deposit: BridgeDeposit; storageRootHash: string }) => {
    console.log(`[Boot] Receipt stored: ${event.storageRootHash} for ${event.deposit.depositId}`);
  });

  // 4. Start the bridge watcher
  await bridgeWatcher.start();
  console.log('[Boot] Bridge watcher started');

  // 5. Start HTTP server
  app.listen(config.server.port, () => {
    console.log(`\n┌────────────────────────────────────────────────────┐`);
    console.log(`│  0G RAMP BACKEND                                   │`);
    console.log(`│  http://localhost:${config.server.port}                            │`);
    console.log(`│  Network : 0G Galileo Testnet (chain ${config.ogChain.chainId})        │`);
    console.log(`│  Storage : ${config.ogStorage.indexerRpc.slice(0, 40)}│`);
    console.log(`└────────────────────────────────────────────────────┘\n`);
  });
}

boot().catch((err) => {
  console.error('[Boot] Fatal error:', err);
  process.exit(1);
});

export default app;
