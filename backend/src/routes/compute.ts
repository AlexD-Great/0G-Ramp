/**
 * /api/compute – 0G Compute network endpoints
 *
 * GET  /services       – list available inference providers
 * GET  /balance        – compute ledger balance
 * POST /deposit        – top-up compute ledger (internal)
 * GET  /jobs/:id       – poll a compute job result
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateBody, internalOnly } from '../middleware/auth';
import { ogCompute } from '../services/ogCompute';

const router = Router();

router.get('/services', async (_req: Request, res: Response) => {
  try {
    const services = await ogCompute.listServices();
    res.json({ services });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

router.get('/balance', async (_req: Request, res: Response) => {
  try {
    const balance = await ogCompute.getLedgerBalance();
    res.json({ balance, unit: 'A0GI' });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

const DepositSchema = z.object({ amount: z.number().positive() });

router.post(
  '/deposit',
  internalOnly,
  validateBody(DepositSchema),
  async (req: Request, res: Response) => {
    const { amount } = req.body as z.infer<typeof DepositSchema>;
    try {
      await ogCompute.depositLedger(amount);
      const balance = await ogCompute.getLedgerBalance();
      res.json({ ok: true, newBalance: balance, unit: 'A0GI' });
    } catch (err) {
      res.status(502).json({ error: String(err) });
    }
  }
);

router.get('/jobs/:jobId', (req: Request, res: Response) => {
  const result = ogCompute.getJobResult(req.params.jobId);
  if (!result) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json(result);
});

export default router;
