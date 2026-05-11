/**
 * /api/kyc — Stripe Identity-backed verification.
 *
 * POST /start  (auth required)
 *   → creates a Stripe Identity VerificationSession scoped to the user's
 *     wallet address (carried in metadata) and returns the hosted URL the
 *     frontend redirects to.
 *
 * GET /me      (auth required)
 *   → reads kycStatus from Firestore. The status is updated by the Stripe
 *     webhook (handled in routes/payments.ts), so this is just a read.
 *
 * The Stripe webhook receives:
 *   identity.verification_session.processing       → kycStatus='verifying'
 *   identity.verification_session.verified         → kycStatus='verified'
 *   identity.verification_session.requires_input   → kycStatus='rejected'
 *   identity.verification_session.canceled         → kycStatus='none'
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { config } from '../config';
import { errorDetail } from '../middleware/auth';
import { requireAuth } from '../middleware/firebaseAuth';
import { getUser, patchUser, type KycStatusValue } from '../services/firebase';

const router = Router();

const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;

router.post('/start', requireAuth, async (req: Request, res: Response) => {
  if (!stripe) {
    res.status(503).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY.' });
    return;
  }
  const walletAddress = req.user!.walletAddress;

  try {
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { walletAddress },
      options: {
        document: {
          allowed_types: ['driving_license', 'passport', 'id_card'],
          require_matching_selfie: true,
          require_live_capture: true,
        },
      },
      return_url: `${config.server.frontendOrigin}/kyc?status=complete`,
    });

    await patchUser(walletAddress, {
      kycStatus: 'submitted',
      kycSubmittedAt: Date.now(),
      kycStripeSessionId: session.id,
      kycRejectReason: undefined,
    });

    res.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error('[KYC] Failed to create Stripe Identity session:', err);
    res.status(502).json({ error: 'Failed to create verification session', detail: errorDetail(err) });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const walletAddress = req.user!.walletAddress;
  const user = await getUser(walletAddress);
  if (!user) {
    res.json({
      walletAddress,
      kycStatus: 'none' as KycStatusValue,
      kycSubmittedAt: null,
      kycVerifiedAt: null,
      kycStripeSessionId: null,
      kycRejectReason: null,
      fullName: null,
    });
    return;
  }
  res.json({
    walletAddress,
    kycStatus: user.kycStatus,
    kycSubmittedAt: user.kycSubmittedAt ?? null,
    kycVerifiedAt: user.kycVerifiedAt ?? null,
    kycStripeSessionId: user.kycStripeSessionId ?? null,
    kycRejectReason: user.kycRejectReason ?? null,
    fullName: user.fullName ?? null,
  });
});

export default router;
