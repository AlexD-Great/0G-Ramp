/**
 * /api/payments – simulated Stripe on-ramp.
 *
 * Flow:
 *   POST /quote                  → USD↔0G conversion preview
 *   POST /checkout               → create a pending ramp tx + paymentIntentId
 *   POST /confirm                → simulate webhook; runs the on-ramp pipeline
 *   GET  /treasury               → on-chain payout-contract balance
 *
 * Pipeline (background, frontend polls /api/transactions/:id):
 *   payment confirmed
 *     → 0G Compute risk score
 *     → if high-risk: status=failed
 *     → else: payout contract sends 0G to user
 *     → 0G Storage anchors receipt
 *     → status=settled, txHash0G + storageRootHash filled
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { validateBody } from '../middleware/auth';
import { ogCompute } from '../services/ogCompute';
import { ogStorage } from '../services/ogStorage';
import { payoutService } from '../services/payout';
import { txStore } from '../services/store';
import { wallet } from '../services/wallet';
import { RampTransaction } from '../types';

const router = Router();

// ─── Quote ────────────────────────────────────────────────────────────────────

function quote(amountUsd: number): { amountUsd: number; amount0G: string; rate: number } {
  const rate = config.payout.usdPerOg;
  const amount0G = (amountUsd / rate).toFixed(6);
  return { amountUsd, amount0G, rate };
}

router.get('/quote/:amountUsd', (req: Request, res: Response) => {
  const usd = parseFloat(req.params.amountUsd);
  if (Number.isNaN(usd) || usd <= 0) {
    res.status(400).json({ error: 'invalid amount' });
    return;
  }
  res.json(quote(usd));
});

// ─── Checkout ─────────────────────────────────────────────────────────────────

const CheckoutSchema = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amountUsd: z.number().positive().min(1).max(10000),
});

router.post('/checkout', validateBody(CheckoutSchema), (req: Request, res: Response) => {
  const { userAddress, amountUsd } = req.body as z.infer<typeof CheckoutSchema>;
  const q = quote(amountUsd);
  const now = Date.now();

  const tx: RampTransaction = {
    id: uuidv4(),
    userAddress,
    assetSymbol: '0G',
    amountIn: amountUsd.toString(),     // USD paid
    amountOut: q.amount0G,                // 0G to receive
    feeAmount: '0',
    sourceChain: 'STRIPE-USD',
    destChain: '0G-Galileo',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  txStore.set(tx.id, tx);

  res.json({
    ok: true,
    paymentIntentId: `pi_sim_${tx.id}`,
    amountUsd,
    amount0G: q.amount0G,
    rate: q.rate,
    transaction: tx,
  });
});

// ─── Confirm ──────────────────────────────────────────────────────────────────

const ConfirmSchema = z.object({
  paymentIntentId: z.string().startsWith('pi_sim_'),
});

router.post('/confirm', validateBody(ConfirmSchema), (req: Request, res: Response) => {
  const { paymentIntentId } = req.body as z.infer<typeof ConfirmSchema>;
  const txId = paymentIntentId.replace('pi_sim_', '');
  const tx = txStore.get(txId);
  if (!tx) {
    res.status(404).json({ error: 'transaction not found' });
    return;
  }
  if (tx.status !== 'pending') {
    res.json({ ok: true, transaction: tx, message: 'already processing or settled' });
    return;
  }

  // Respond immediately; pipeline runs in background. Frontend polls
  // /api/transactions/:id for status updates.
  res.json({ ok: true, transaction: { ...tx, status: 'verifying' }, message: 'pipeline started' });

  runOnRampPipeline(tx).catch((err) => {
    console.error(`[Payments] Pipeline failed for ${tx.id}:`, err);
    const cur = txStore.get(tx.id);
    if (cur) txStore.set(tx.id, { ...cur, status: 'failed', updatedAt: Date.now() });
  });
});

// ─── Pipeline ────────────────────────────────────────────────────────────────

async function runOnRampPipeline(tx: RampTransaction): Promise<void> {
  console.log(`[Payments] Starting on-ramp pipeline for ${tx.id} – ${tx.amountIn} USD → ${tx.amountOut} 0G`);

  // 1. Mark verifying
  txStore.set(tx.id, { ...tx, status: 'verifying', updatedAt: Date.now() });

  // 2. Spawn AI risk-score job
  let computeJobId: string | undefined;
  try {
    const job = await ogCompute.submitRiskScore({
      txId: tx.id,
      userAddress: tx.userAddress,
      amountUsd: parseFloat(tx.amountIn),
      sourceChain: tx.sourceChain,
      destChain: tx.destChain,
    });
    computeJobId = job.jobId;
    txStore.set(tx.id, { ...txStore.get(tx.id)!, computeJobId });
    console.log(`[Payments] Compute risk job: ${computeJobId}`);
  } catch (err) {
    console.warn(`[Payments] Compute job submission failed (non-fatal):`, err);
  }

  // 3. Wait briefly for risk result
  const risk = await awaitRiskResult(computeJobId);
  if (isHighRisk(risk)) {
    console.warn(`[Payments] BLOCKED tx ${tx.id} – AI flagged high-risk:`, risk);
    txStore.set(tx.id, { ...txStore.get(tx.id)!, status: 'failed', updatedAt: Date.now() });
    return;
  }

  // 4. Compute fee + execute payout via the OGRampPayout contract.
  const grossOg = tx.amountOut;
  const { net, fee } = wallet.computeFee(grossOg);

  let payoutTxHash: string | undefined;
  try {
    const result = await payoutService.sendPayout(tx.userAddress, net, tx.id);
    payoutTxHash = result.txHash;
    console.log(`[Payments] Payout settled on-chain: ${result.txHash} (${net} 0G → ${result.to})`);
  } catch (err) {
    console.error(`[Payments] Payout reverted:`, err);
    txStore.set(tx.id, { ...txStore.get(tx.id)!, status: 'failed', updatedAt: Date.now() });
    return;
  }

  // 5. Anchor immutable receipt on 0G Storage.
  let storageRootHash: string | undefined;
  try {
    const result = await ogStorage.storeReceipt({
      txId: tx.id,
      userAddress: tx.userAddress,
      asset: tx.assetSymbol,
      amountIn: tx.amountIn,
      amountOut: net,
      feeAmount: fee,
      sourceChain: tx.sourceChain,
      destChain: tx.destChain,
      settlementTxHash: payoutTxHash!,
      settledAt: Date.now(),
    });
    storageRootHash = result.rootHash;
    console.log(`[Payments] 0G Storage receipt anchored: ${storageRootHash}`);
  } catch (err) {
    console.warn(`[Payments] Storage anchor failed (non-fatal):`, err);
  }

  // 6. Mark settled with full provenance.
  const cur = txStore.get(tx.id)!;
  txStore.set(tx.id, {
    ...cur,
    amountOut: net,
    feeAmount: fee,
    txHash0G: payoutTxHash,
    storageRootHash,
    status: 'settled',
    updatedAt: Date.now(),
  });
  console.log(`[Payments] ✅ Ramp tx ${tx.id} → settled (${net} 0G to user, fee ${fee})`);
}

const RISK_WAIT_MS = 5000;
const RISK_POLL_MS = 250;

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

// ─── Treasury ─────────────────────────────────────────────────────────────────

router.get('/treasury', async (_req: Request, res: Response) => {
  try {
    if (!payoutService.isConfigured()) {
      res.status(503).json({ error: 'OG_PAYOUT_CONTRACT not configured' });
      return;
    }
    const balance = await payoutService.treasuryBalance();
    res.json({ contract: payoutService.contractAddress(), balance, unit: '0G' });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

export default router;
