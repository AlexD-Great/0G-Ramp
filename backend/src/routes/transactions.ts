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
import { validateBody, internalOnly } from '../middleware/auth';
import { ogCompute } from '../services/ogCompute';
import { ogStorage } from '../services/ogStorage';
import { wallet } from '../services/wallet';
import { RampTransaction } from '../types';

const router = Router();

// In-memory store – replace with a DB in production
const txStore = new Map<string, RampTransaction>();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const InitiateSchema = z.object({
  userAddress: z.string().min(10),
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
router.post('/initiate', validateBody(InitiateSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof InitiateSchema>;
  const now = Date.now();

  const tx: RampTransaction = {
    id: uuidv4(),
    userAddress: body.userAddress,
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
    }
  }).catch(console.error);

  res.status(201).json({ ok: true, transaction: tx });
});

// GET /api/transactions/:id
router.get('/:id', (req: Request, res: Response) => {
  const tx = txStore.get(req.params.id);
  if (!tx) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  // Attach compute job result if available
  let computeResult = null;
  if (tx.computeJobId) {
    computeResult = ogCompute.getJobResult(tx.computeJobId);
  }

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
    res.status(500).json({ error: 'Payout failed', detail: String(err) });
  }
});

// GET /api/transactions  (list all – dev only)
router.get('/', (_req: Request, res: Response) => {
  const all = Array.from(txStore.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json({ transactions: all, count: all.length });
});

export default router;
