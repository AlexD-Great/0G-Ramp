/**
 * /api/payments – Stripe-backed on-ramp.
 *
 * Flow:
 *   GET  /quote/:amountUsd           → USD↔0G conversion preview
 *   POST /create-checkout-session    → creates pending ramp tx + Stripe
 *                                       Checkout Session, returns hosted URL
 *   POST /webhook                    → Stripe webhook; on
 *                                       checkout.session.completed runs the
 *                                       on-ramp pipeline (risk → payout →
 *                                       0G Storage anchor)
 *   GET  /treasury                   → on-chain payout-contract balance
 *
 * The webhook handler is exported separately and mounted in server.ts with
 * express.raw() so signature verification works.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { config } from '../config';
import { validateBody } from '../middleware/auth';
import { requireAuth } from '../middleware/firebaseAuth';
import { getUser, patchUser } from '../services/firebase';
import { ogCompute } from '../services/ogCompute';
import { ogStorage } from '../services/ogStorage';
import { payoutService } from '../services/payout';
import { txStore } from '../services/store';
import { wallet } from '../services/wallet';
import { RampTransaction } from '../types';

const router = Router();

const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey)
  : null;

function requireStripe(res: Response): typeof stripe {
  if (!stripe) {
    res.status(503).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY in backend/.env' });
    return null;
  }
  return stripe;
}

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

// ─── Create Checkout Session ──────────────────────────────────────────────────

const CheckoutSchema = z.object({
  amountUsd: z.number().positive().min(1).max(10000),
});

router.post('/create-checkout-session', requireAuth, validateBody(CheckoutSchema), async (req: Request, res: Response) => {
  const s = requireStripe(res);
  if (!s) return;

  const userAddress = req.user!.walletAddress;
  const { amountUsd } = req.body as z.infer<typeof CheckoutSchema>;

  // KYC gate — only verified users can on-ramp.
  const user = await getUser(userAddress);
  if (!user || user.kycStatus !== 'verified') {
    res.status(403).json({
      error: 'KYC required',
      kycStatus: user?.kycStatus ?? 'none',
      message: 'Complete identity verification before purchasing.',
    });
    return;
  }

  const q = quote(amountUsd);
  const now = Date.now();

  const tx: RampTransaction = {
    id: uuidv4(),
    userAddress,
    assetSymbol: '0G',
    amountIn: amountUsd.toString(),
    amountOut: q.amount0G,
    feeAmount: '0',
    sourceChain: 'STRIPE-USD',
    destChain: '0G-Galileo',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  txStore.set(tx.id, tx);

  const origin = config.server.frontendOrigin;
  try {
    const session = await s.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(amountUsd * 100),
            product_data: {
              name: `${q.amount0G} 0G tokens`,
              description: `On-ramp to 0G Galileo · destination ${userAddress}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        txId: tx.id,
        userAddress,
        amount0G: q.amount0G,
      },
      success_url: `${origin}/buy?session_id={CHECKOUT_SESSION_ID}&txId=${tx.id}&status=success`,
      cancel_url: `${origin}/buy?txId=${tx.id}&status=cancelled`,
    });

    res.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
      txId: tx.id,
      amountUsd,
      amount0G: q.amount0G,
      rate: q.rate,
    });
  } catch (err) {
    console.error('[Payments] Stripe session creation failed:', err);
    txStore.set(tx.id, { ...tx, status: 'failed', updatedAt: Date.now() });
    res.status(502).json({ error: 'Failed to create Stripe session', detail: String(err) });
  }
});

// ─── Webhook handler (mounted in server.ts with express.raw) ──────────────────

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  if (!stripe) {
    res.status(503).json({ error: 'Stripe not configured' });
    return;
  }
  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    res.status(400).json({ error: 'missing stripe-signature header' });
    return;
  }
  if (!config.stripe.webhookSecret) {
    res.status(503).json({ error: 'STRIPE_WEBHOOK_SECRET not configured' });
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, config.stripe.webhookSecret);
  } catch (err) {
    console.warn('[Payments] Webhook signature verification failed:', err);
    res.status(400).json({ error: 'invalid signature' });
    return;
  }

  // ─── Stripe Identity (KYC) ────────────────────────────────────────────────
  if (event.type.startsWith('identity.verification_session.')) {
    const obj = event.data.object as {
      id: string;
      status?: string;
      last_error?: { code?: string; reason?: string } | null;
      metadata?: Record<string, string> | null;
    };
    const walletAddress = obj.metadata?.walletAddress?.toLowerCase();
    if (!walletAddress) {
      console.warn('[Identity] Webhook session missing walletAddress metadata');
      res.json({ received: true, ignored: 'no walletAddress metadata' });
      return;
    }

    const patch: Record<string, unknown> = {};
    switch (event.type) {
      case 'identity.verification_session.processing':
        patch.kycStatus = 'verifying';
        break;
      case 'identity.verification_session.verified':
        patch.kycStatus = 'verified';
        patch.kycVerifiedAt = Date.now();
        patch.kycRejectReason = null;
        break;
      case 'identity.verification_session.requires_input':
        patch.kycStatus = 'rejected';
        patch.kycRejectReason = obj.last_error?.reason ?? obj.last_error?.code ?? 'unknown';
        break;
      case 'identity.verification_session.canceled':
        patch.kycStatus = 'none';
        break;
      default:
        res.json({ received: true });
        return;
    }

    try {
      await patchUser(walletAddress, patch);
      console.log(`[Identity] ${walletAddress} → ${patch.kycStatus}`);
    } catch (err) {
      console.error('[Identity] Failed to update Firestore:', err);
    }
    res.json({ received: true });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { metadata?: Record<string, string> | null };
    const txId = session.metadata?.txId;
    if (!txId) {
      console.warn('[Payments] Webhook session missing txId metadata');
      res.json({ received: true, ignored: 'no txId metadata' });
      return;
    }
    const tx = txStore.get(txId);
    if (!tx) {
      console.warn(`[Payments] Webhook for unknown tx ${txId}`);
      res.json({ received: true, ignored: 'unknown tx' });
      return;
    }
    if (tx.status !== 'pending') {
      res.json({ received: true, ignored: 'already processed' });
      return;
    }

    res.json({ received: true });
    runOnRampPipeline(tx).catch((err) => {
      console.error(`[Payments] Pipeline failed for ${tx.id}:`, err);
      const cur = txStore.get(tx.id);
      if (cur) txStore.set(tx.id, { ...cur, status: 'failed', updatedAt: Date.now() });
    });
    return;
  }

  res.json({ received: true });
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

async function runOnRampPipeline(tx: RampTransaction): Promise<void> {
  console.log(`[Payments] Starting on-ramp pipeline for ${tx.id} – ${tx.amountIn} USD → ${tx.amountOut} 0G`);

  txStore.set(tx.id, { ...tx, status: 'verifying', updatedAt: Date.now() });

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

  const risk = await awaitRiskResult(computeJobId);
  if (isHighRisk(risk)) {
    console.warn(`[Payments] BLOCKED tx ${tx.id} – AI flagged high-risk:`, risk);
    txStore.set(tx.id, { ...txStore.get(tx.id)!, status: 'failed', updatedAt: Date.now() });
    return;
  }

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
  console.log(`[Payments] Ramp tx ${tx.id} → settled (${net} 0G to user, fee ${fee})`);
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
