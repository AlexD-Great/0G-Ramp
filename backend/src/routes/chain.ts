/**
 * /api/chain – 0G Chain queries
 * GET  /status          – block number, network info
 * GET  /balance/:addr   – native A0GI balance
 * GET  /token/:token/:addr – ERC-20 balance
 * GET  /tx/:hash        – transaction lookup + explorer link
 * GET  /wallet          – hot wallet status (admin)
 */

import { Router, Request, Response } from 'express';
import { ogChain } from '../services/ogChain';
import { wallet } from '../services/wallet';

const router = Router();

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const [block, network] = await Promise.all([
      ogChain.getBlockNumber(),
      ogChain.getNetwork(),
    ]);
    res.json({
      ok: true,
      chainId: Number(network.chainId),
      name: network.name,
      blockNumber: block,
      rpc: 'https://evmrpc-testnet.0g.ai',
      explorer: 'https://chainscan-galileo.0g.ai',
    });
  } catch (err) {
    res.status(502).json({ error: 'Chain unreachable', detail: String(err) });
  }
});

router.get('/balance/:address', async (req: Request, res: Response) => {
  try {
    const balance = await ogChain.getNativeBalance(req.params.address);
    res.json({ address: req.params.address, balance, unit: 'A0GI' });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

router.get('/token/:token/:address', async (req: Request, res: Response) => {
  try {
    const balance = await ogChain.getTokenBalance(req.params.token, req.params.address);
    res.json({ token: req.params.token, address: req.params.address, balance });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

router.get('/tx/:hash', async (req: Request, res: Response) => {
  try {
    const [tx, receipt] = await Promise.all([
      ogChain.getTransaction(req.params.hash),
      ogChain.getTransactionReceipt(req.params.hash),
    ]);
    res.json({
      hash: req.params.hash,
      found: !!tx,
      status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
      blockNumber: receipt?.blockNumber ?? null,
      explorerUrl: ogChain.explorerUrl(req.params.hash),
    });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

router.get('/wallet', async (_req: Request, res: Response) => {
  try {
    const [native, gasOk] = await Promise.all([
      wallet.getNativeBalance(),
      wallet.checkGasHealth(),
    ]);
    res.json({
      address: wallet.getAddress(),
      nativeBalance: native,
      unit: 'A0GI',
      gasHealthy: gasOk,
    });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

export default router;
