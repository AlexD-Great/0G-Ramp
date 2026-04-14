/**
 * /api/kyc – KYC submission and verification
 *
 * POST /submit    – upload KYC document blob → 0G Storage + 0G Compute verify
 * GET  /status/:userId – poll KYC verification status
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as crypto from 'crypto';
import { validateBody } from '../middleware/auth';
import { ogStorage } from '../services/ogStorage';
import { ogCompute } from '../services/ogCompute';
import { KYCRecord } from '../types';

const router = Router();

// In-memory KYC store – replace with encrypted DB in production
const kycStore = new Map<string, KYCRecord>();

// ─── Schema ──────────────────────────────────────────────────────────────────

const SubmitKycSchema = z.object({
  userId: z.string().min(1),
  userAddress: z.string().min(10),
  documentType: z.enum(['passport', 'national_id', 'drivers_license']),
  // Base64-encoded document bytes (encrypted client-side before sending)
  documentBase64: z.string().min(1),
  fullName: z.string().min(2),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/kyc/submit
router.post('/submit', validateBody(SubmitKycSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof SubmitKycSchema>;

  // Decode document bytes
  let docBytes: Buffer;
  try {
    docBytes = Buffer.from(body.documentBase64, 'base64');
  } catch {
    res.status(400).json({ error: 'Invalid base64 document' });
    return;
  }

  const documentHash = crypto.createHash('sha256').update(docBytes).digest('hex');

  // 1. Upload to 0G Storage (immutable, permanent)
  let storageResult;
  try {
    storageResult = await ogStorage.storeKyc(body.userId, body.userAddress, docBytes);
  } catch (err) {
    res.status(502).json({ error: '0G Storage upload failed', detail: String(err) });
    return;
  }

  // 2. Submit 0G Compute verification job
  let computeJob;
  try {
    computeJob = await ogCompute.submitKycVerification({
      userId: body.userId,
      documentSha256: documentHash,
      storageRootHash: storageResult.rootHash,
      documentType: body.documentType,
    });
  } catch (err) {
    console.warn('[KYC] Compute job submission failed (non-fatal):', err);
    computeJob = { jobId: 'unavailable', status: 'failed' as const };
  }

  // 3. Persist KYC record
  const record: KYCRecord = {
    userId: body.userId,
    userAddress: body.userAddress,
    fullName: body.fullName,
    documentHash,
    storageRootHash: storageResult.rootHash,
    verifiedAt: 0,                    // set when compute job completes
    computeJobId: computeJob.jobId,
  };
  kycStore.set(body.userId, record);

  res.status(202).json({
    ok: true,
    userId: body.userId,
    documentHash,
    storageRootHash: storageResult.rootHash,
    computeJobId: computeJob.jobId,
    message: 'KYC submitted. Poll /api/kyc/status/:userId for result.',
  });
});

// GET /api/kyc/status/:userId
router.get('/status/:userId', (req: Request, res: Response) => {
  const record = kycStore.get(req.params.userId);
  if (!record) {
    res.status(404).json({ error: 'KYC record not found' });
    return;
  }

  const computeResult = ogCompute.getJobResult(record.computeJobId);

  // If compute just finished, stamp the verification time
  if (computeResult?.status === 'completed' && record.verifiedAt === 0) {
    record.verifiedAt = Date.now();
    kycStore.set(req.params.userId, record);
  }

  res.json({
    userId: record.userId,
    userAddress: record.userAddress,
    documentHash: record.documentHash,
    storageRootHash: record.storageRootHash,
    computeJobId: record.computeJobId,
    computeStatus: computeResult?.status ?? 'unknown',
    computeResult: computeResult?.result ?? null,
    verified: record.verifiedAt > 0,
    verifiedAt: record.verifiedAt || null,
  });
});

export default router;
