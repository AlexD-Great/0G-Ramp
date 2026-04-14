/**
 * /api/storage – 0G Storage endpoints
 *
 * POST /upload        – upload arbitrary bytes, returns rootHash
 * GET  /download/:root – download blob by root hash
 * GET  /verify/:root  – check root exists on-chain
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateBody, internalOnly } from '../middleware/auth';
import { ogStorage } from '../services/ogStorage';

const router = Router();

const UploadSchema = z.object({
  dataBase64: z.string().min(1),
  tags: z.record(z.string()).optional(),
});

router.post('/upload', internalOnly, validateBody(UploadSchema), async (req: Request, res: Response) => {
  const { dataBase64, tags } = req.body as z.infer<typeof UploadSchema>;
  try {
    const data = Buffer.from(dataBase64, 'base64');
    const result = await ogStorage.uploadBytes(data);
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

router.get('/download/:root', internalOnly, async (req: Request, res: Response) => {
  try {
    const data = await ogStorage.downloadByRoot(req.params.root);
    res.json({ rootHash: req.params.root, dataBase64: data.toString('base64'), size: data.length });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

router.get('/verify/:root', async (req: Request, res: Response) => {
  try {
    const exists = await ogStorage.verifyRootOnChain(req.params.root);
    res.json({ rootHash: req.params.root, onChain: exists });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

export default router;
