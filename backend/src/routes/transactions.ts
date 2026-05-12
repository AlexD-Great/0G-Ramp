/**
 * /api/transactions – Ramp transaction lifecycle
 *
 * POST /initiate   – create a new ramp transaction (onramp/offramp intent)
 * GET  /:id        – fetch transaction status
 * POST /:id/settle – internal: mark settled after payout completes
 * POST /payout     – internal: trigger payout for a detected deposit
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { validateBody, internalOnly, errorDetail } from '../middleware/auth';
import { requireAuth } from '../middleware/firebaseAuth';
import { ogCompute } from '../services/ogCompute';
import { ogStorage } from '../services/ogStorage';
import { wallet } from '../services/wallet';
import { txStore } from '../services/store';
import { RampTransaction } from '../types';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const InitiateSchema = z.object({
  assetSymbol: z.string().min(1),
  amountIn: z.string().min(1),
  sourceChain: z.string().min(1),
  destChain: z.string().min(1),
  tokenAddress: z.string().optional(),
});

const PayoutSchema = z.object({
  txId: z.string().uuid(),
  toAddress: z.string().min(10),
  tokenAddress: z.string().min(10),
  grossAmount: z.string().min(1),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/transactions/initiate
router.post('/initiate', requireAuth, validateBody(InitiateSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof InitiateSchema>;
  const now = Date.now();
  const userAddress = req.user!.walletAddress;

  const tx: RampTransaction = {
    id: uuidv4(),
    userAddress,
    assetSymbol: body.assetSymbol,
    amountIn: body.amountIn,
    amountOut: '0',
    feeAmount: '0',
    sourceChain: body.sourceChain,
    destChain: body.destChain,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  txStore.set(tx.id, tx);

  // Kick off a 0G Compute risk-score job immediately
  ogCompute.submitRiskScore({
    txId: tx.id,
    userAddress: tx.userAddress,
    amountUsd: parseFloat(tx.amountIn),
    sourceChain: tx.sourceChain,
    destChain: tx.destChain,
  }).then((job) => {
    const stored = txStore.get(tx.id);
    if (stored) {
      stored.computeJobId = job.jobId;
      stored.status = 'verifying';
      stored.updatedAt = Date.now();
      txStore.set(tx.id, stored);
    }
  }).catch(console.error);

  res.status(201).json({ ok: true, transaction: tx });
});

// GET /api/transactions/mine  (auth required) – ramp txs for the calling user
// MUST be declared before /:id, otherwise Express matches "mine" as the id param.
router.get('/mine', requireAuth, (req: Request, res: Response) => {
  const addr = req.user!.walletAddress;
  const all = Array.from(txStore.values())
    .filter((t: RampTransaction) => t.userAddress.toLowerCase() === addr)
    .sort((a: RampTransaction, b: RampTransaction) => b.createdAt - a.createdAt);
  res.json({ transactions: all, count: all.length });
});

// GET /api/transactions/:id  (auth required, owner-only)
router.get('/:id', requireAuth, (req: Request, res: Response) => {
  const tx = txStore.get(req.params.id);
  if (!tx || tx.userAddress.toLowerCase() !== req.user!.walletAddress) {
    // Same 404 for missing vs. unauthorized to avoid existence oracle.
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  // Attach compute job result if available
  let computeResult = null;
  if (tx.computeJobId) {
    computeResult = ogCompute.getJobResult(tx.computeJobId);
  }

  // Tx state changes mid-pipeline (computeJobId → txHash0G → settled). Any
  // intermediate cache (CDN, proxy, browser) that serves a stale response
  // would leave the frontend stuck on an earlier stage post-payment.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.json({ transaction: tx, computeResult });
});

// POST /api/transactions/payout  (internal – bridge watcher callback)
router.post('/payout', internalOnly, validateBody(PayoutSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof PayoutSchema>;

  const tx = txStore.get(body.txId);
  if (!tx) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  try {
    const payout = await wallet.payout({
      txId: body.txId,
      toAddress: body.toAddress,
      tokenAddress: body.tokenAddress,
      grossAmount: body.grossAmount,
    });

    // Anchor receipt on 0G Storage
    let storageRootHash: string | undefined;
    try {
      const storageResult = await ogStorage.storeReceipt({
        txId: body.txId,
        userAddress: body.toAddress,
        asset: tx.assetSymbol,
        amountIn: body.grossAmount,
        amountOut: payout.netAmount,
        feeAmount: payout.feeAmount,
        sourceChain: tx.sourceChain,
        destChain: tx.destChain,
        settlementTxHash: payout.txHash,
        settledAt: Date.now(),
      });
      storageRootHash = storageResult.rootHash;
    } catch (err) {
      console.warn('[Transactions] Storage receipt failed (non-fatal):', err);
    }

    const settled = wallet.buildSettledTransaction(tx, payout, storageRootHash, tx.computeJobId);
    txStore.set(body.txId, settled);

    res.json({ ok: true, transaction: settled, explorerUrl: payout.explorerUrl });
  } catch (err) {
    tx.status = 'failed';
    tx.updatedAt = Date.now();
    txStore.set(body.txId, tx);
    console.error('[Transactions] Payout failed:', err);
    res.status(500).json({ error: 'Payout failed', detail: errorDetail(err) });
  }
});

// GET /api/transactions  (public live-ledger feed — PII redacted)
// Powers the homepage widgets and /node page. We deliberately strip:
//   - full userAddress (truncated to first6…last4)
//   - settlement tx hashes and compute job IDs (internal correlation IDs)
// Only the most recent 50 are returned to keep the feed bounded.
function redactForPublicLedger(t: RampTransaction): Record<string, unknown> {
  const addr = t.userAddress;
  const masked = addr.length >= 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '0x…';
  return {
    id: t.id,
    userAddressMasked: masked,
    assetSymbol: t.assetSymbol,
    amountIn: t.amountIn,
    amountOut: t.amountOut,
    feeAmount: t.feeAmount,
    sourceChain: t.sourceChain,
    destChain: t.destChain,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

router.get('/', (_req: Request, res: Response) => {
  const all = Array.from(txStore.values())
    .sort((a: RampTransaction, b: RampTransaction) => b.createdAt - a.createdAt)
    .slice(0, 50)
    .map(redactForPublicLedger);
  res.json({ transactions: all, count: all.length });
});

export default router;
