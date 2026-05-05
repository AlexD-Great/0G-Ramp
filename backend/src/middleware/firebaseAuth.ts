/**
 * firebaseAuth.ts — Verifies Firebase ID tokens on protected routes.
 *
 * Expects:    Authorization: Bearer <Firebase ID token>
 * On success: req.user = { walletAddress }
 * On failure: 401
 *
 * The wallet address is the Firebase UID (set when we minted the custom
 * token in /api/auth/verify). Routes can trust req.user.walletAddress.
 */

import { Request, Response, NextFunction } from 'express';
import { firebase } from '../services/firebase';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { walletAddress: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!firebase.isReady()) {
    res.status(503).json({ error: 'Firebase not configured' });
    return;
  }
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }
  const idToken = header.slice('Bearer '.length).trim();
  try {
    const decoded = await firebase.auth().verifyIdToken(idToken);
    const walletAddress = (decoded.walletAddress as string | undefined) ?? decoded.uid;
    req.user = { walletAddress: walletAddress.toLowerCase() };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session token', detail: String(err) });
  }
}
