/**
 * server.ts – 0G Ramp Backend
 *
 * Express server that orchestrates:
 *   • 0G Chain   – on-chain tx, ERC-20 transfers, ledger reads
 *   • 0G Storage – immutable KYC / receipt anchoring
 *   • 0G Compute – AI-driven verification jobs
 *   • Bridge Watcher – detects cross-chain deposits → triggers payouts
 *
 * All 0G interactions target the Newton Testnet (chain ID 16600).
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { bridgeWatcher } from './services/bridgeWatcher';
import { ogChain } from './services/ogChain';
import { wallet } from './services/wallet';
import { BridgeDeposit } from './types';

// ─── Routes ──────────────────────────────────────────────────────────────────
import chainRoutes from './routes/chain';
import transactionRoutes from './routes/transactions';
import kycRoutes from './routes/kyc';
import computeRoutes from './routes/compute';
import storageRoutes from './routes/storage';

const app = express();

// ─── Security & parsing ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.server.frontendOrigin,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' })); // KYC documents can be large

// ─── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});
app.use(limiter);

// ─── Health / readiness ───────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: '0g-ramp-backend',
    network: '0G-Newton-Testnet',
    chainId: config.ogChain.chainId,
    timestamp: Date.now(),
  });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/chain', chainRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/compute', computeRoutes);
app.use('/api/storage', storageRoutes);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot(): Promise<void> {
  // 1. Verify 0G Chain connectivity
  try {
    const block = await ogChain.getBlockNumber();
    console.log(`[Boot] 0G Chain connected. Block: ${block}`);
  } catch (err) {
    console.warn('[Boot] 0G Chain not reachable – continuing anyway:', err);
  }

  // 2. Check hot wallet gas balance
  if (config.hotWallet.privateKey) {
    try {
      await wallet.checkGasHealth();
      console.log(`[Boot] Hot wallet: ${wallet.getAddress()}`);
    } catch (err) {
      console.warn('[Boot] Hot wallet check failed:', err);
    }
  }

  // 3. Wire up bridge watcher events
  bridgeWatcher.on('deposit', (deposit: BridgeDeposit) => {
    console.log(`[Boot] Bridge deposit detected: ${deposit.depositId} – ${deposit.amount} ${deposit.asset}`);
  });

  bridgeWatcher.on('payout_required', async (event: { deposit: BridgeDeposit; computeJobId: string }) => {
    // In a full implementation this would call the /api/transactions/payout route
    // or directly call wallet.payout() with the configured stablecoin address
    console.log(`[Boot] Payout required for deposit ${event.deposit.depositId}`);
  });

  bridgeWatcher.on('receipt_stored', (event: { deposit: BridgeDeposit; storageRootHash: string }) => {
    console.log(`[Boot] Receipt stored: ${event.storageRootHash} for ${event.deposit.depositId}`);
  });

  // 4. Start the bridge watcher
  await bridgeWatcher.start();
  console.log('[Boot] Bridge watcher started');

  // 5. Start HTTP server
  app.listen(config.server.port, () => {
    console.log(`\n┌────────────────────────────────────────────────────┐`);
    console.log(`│  0G RAMP BACKEND                                   │`);
    console.log(`│  http://localhost:${config.server.port}                            │`);
    console.log(`│  Network : 0G Newton Testnet (chain 16600)         │`);
    console.log(`│  Storage : ${config.ogStorage.indexerRpc.slice(0, 40)}│`);
    console.log(`└────────────────────────────────────────────────────┘\n`);
  });
}

boot().catch((err) => {
  console.error('[Boot] Fatal error:', err);
  process.exit(1);
});

export default app;
