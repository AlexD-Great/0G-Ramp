/**
 * /api/auth — Sign-In With Ethereum (EIP-4361 style) → Firebase custom token.
 *
 * Flow:
 *   POST /nonce   { walletAddress }
 *     → returns a single-use nonce + the exact message the wallet must sign
 *   POST /verify  { walletAddress, signature }
 *     → verifies the signature, recovers the address, mints a Firebase
 *       custom token (UID = walletAddress lowercased), upserts the user doc.
 *
 * The frontend then signs into Firebase Auth with that custom token; from
 * then on, all API calls carry an Authorization: Bearer <Firebase ID token>
 * header that backend middleware verifies.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ethers } from 'ethers';
import { randomBytes } from 'crypto';
import { validateBody, errorDetail } from '../middleware/auth';
import { firebase, upsertUserOnSignIn } from '../services/firebase';

const router = Router();

const NONCE_TTL_MS = 5 * 60 * 1000;
const nonces = new Map<string, { nonce: string; issuedAt: number }>();

function buildSignInMessage(walletAddress: string, nonce: string): string {
  return [
    'Sign in to OG Ramp',
    '',
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    'Signing this message proves you control this wallet. It does not authorize any transaction or transfer.',
  ].join('\n');
}

function pruneNonces(): void {
  const cutoff = Date.now() - NONCE_TTL_MS;
  for (const [addr, entry] of nonces) {
    if (entry.issuedAt < cutoff) nonces.delete(addr);
  }
}

const NonceSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

router.post('/nonce', validateBody(NonceSchema), (req: Request, res: Response) => {
  if (!firebase.isReady()) {
    res.status(503).json({ error: 'Firebase not configured' });
    return;
  }
  pruneNonces();
  const { walletAddress } = req.body as z.infer<typeof NonceSchema>;
  const addr = walletAddress.toLowerCase();
  const nonce = randomBytes(16).toString('hex');
  nonces.set(addr, { nonce, issuedAt: Date.now() });
  res.json({
    nonce,
    message: buildSignInMessage(walletAddress, nonce),
    expiresInMs: NONCE_TTL_MS,
  });
});

const VerifySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().min(1),
});

router.post('/verify', validateBody(VerifySchema), async (req: Request, res: Response) => {
  if (!firebase.isReady()) {
    res.status(503).json({ error: 'Firebase not configured' });
    return;
  }
  const { walletAddress, signature } = req.body as z.infer<typeof VerifySchema>;
  const addr = walletAddress.toLowerCase();

  const entry = nonces.get(addr);
  if (!entry || Date.now() - entry.issuedAt > NONCE_TTL_MS) {
    res.status(400).json({ error: 'No active nonce. Request a fresh one.' });
    return;
  }

  const message = buildSignInMessage(walletAddress, entry.nonce);
  let recovered: string;
  try {
    recovered = ethers.verifyMessage(message, signature);
  } catch (err) {
    console.warn('[Auth] Signature verify error:', err);
    res.status(400).json({ error: 'Invalid signature', detail: errorDetail(err) });
    return;
  }

  if (recovered.toLowerCase() !== addr) {
    res.status(401).json({ error: 'Signature does not match wallet address' });
    return;
  }

  // One-shot: burn the nonce
  nonces.delete(addr);

  try {
    const user = await upsertUserOnSignIn(addr);
    const customToken = await firebase.auth().createCustomToken(addr, {
      walletAddress: addr,
    });
    res.json({ ok: true, customToken, user });
  } catch (err) {
    console.error('[Auth] Failed to mint custom token:', err);
    res.status(500).json({ error: 'Failed to issue session', detail: errorDetail(err) });
  }
});

export default router;
