/**
 * firebase.ts — Firebase Admin SDK wrapper
 *
 * Singleton initialization. Exposes:
 *   - auth     : Firebase Auth admin (mints custom tokens, verifies ID tokens)
 *   - db       : Firestore (user docs, KYC status)
 *   - isReady() : false if FIREBASE_* env vars are missing — routes that
 *                 depend on Firebase should 503 in that case.
 *
 * User documents live at users/{walletAddress} with shape:
 *   {
 *     walletAddress: string,        // lowercase 0x...
 *     createdAt: number,
 *     lastSignInAt: number,
 *     kycStatus: 'none' | 'submitted' | 'verifying' | 'verified' | 'rejected',
 *     kycSubmittedAt?: number,
 *     kycVerifiedAt?: number,
 *     kycStorageRoot?: string,
 *     kycComputeJobId?: string,
 *     fullName?: string,
 *   }
 */

import * as admin from 'firebase-admin';
import { config } from '../config';

let app: admin.app.App | null = null;

function init(): admin.app.App | null {
  if (app) return app;

  let credential: admin.credential.Credential | null = null;

  if (config.firebase.serviceAccountJson) {
    try {
      const parsed = JSON.parse(config.firebase.serviceAccountJson);
      credential = admin.credential.cert(parsed);
    } catch (err) {
      console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT could not be parsed as JSON:', err);
    }
  } else if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
    credential = admin.credential.cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    });
  }

  if (!credential) {
    console.warn('[Firebase] No credentials configured — auth + KYC persistence will be disabled.');
    return null;
  }

  app = admin.initializeApp({ credential });
  // Treat `undefined` field values as "skip" rather than throwing — lets us
  // pass partial patches without filtering out undefined keys at every call site.
  app.firestore().settings({ ignoreUndefinedProperties: true });
  console.log('[Firebase] Admin SDK initialized');
  return app;
}

const initialized = init();

export const firebase = {
  isReady(): boolean {
    return initialized !== null;
  },
  auth(): admin.auth.Auth {
    if (!initialized) throw new Error('Firebase Admin SDK not initialized');
    return initialized.auth();
  },
  db(): admin.firestore.Firestore {
    if (!initialized) throw new Error('Firebase Admin SDK not initialized');
    return initialized.firestore();
  },
};

export type KycStatusValue = 'none' | 'submitted' | 'verifying' | 'verified' | 'rejected';

export interface UserDoc {
  walletAddress: string;
  createdAt: number;
  lastSignInAt: number;
  kycStatus: KycStatusValue;
  kycSubmittedAt?: number;
  kycVerifiedAt?: number;
  kycStorageRoot?: string;
  kycComputeJobId?: string;
  /** Stripe Identity VerificationSession id (`vs_...`). */
  kycStripeSessionId?: string;
  /** Last failure reason returned by Stripe Identity (e.g. document_unverified). */
  kycRejectReason?: string;
  fullName?: string;
}

export async function findUserByStripeSession(sessionId: string): Promise<UserDoc | null> {
  const snap = await firebase.db().collection(USERS).where('kycStripeSessionId', '==', sessionId).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data() as UserDoc;
}

const USERS = 'users';

export async function upsertUserOnSignIn(walletAddress: string): Promise<UserDoc> {
  const addr = walletAddress.toLowerCase();
  const ref = firebase.db().collection(USERS).doc(addr);
  const snap = await ref.get();
  const now = Date.now();
  if (!snap.exists) {
    const doc: UserDoc = {
      walletAddress: addr,
      createdAt: now,
      lastSignInAt: now,
      kycStatus: 'none',
    };
    await ref.set(doc);
    return doc;
  }
  await ref.update({ lastSignInAt: now });
  return { ...(snap.data() as UserDoc), lastSignInAt: now };
}

export async function getUser(walletAddress: string): Promise<UserDoc | null> {
  const ref = firebase.db().collection(USERS).doc(walletAddress.toLowerCase());
  const snap = await ref.get();
  return snap.exists ? (snap.data() as UserDoc) : null;
}

export async function patchUser(walletAddress: string, patch: Partial<UserDoc>): Promise<void> {
  const ref = firebase.db().collection(USERS).doc(walletAddress.toLowerCase());
  await ref.set(patch, { merge: true });
}
