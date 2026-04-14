/**
 * bridgeWatcher.ts – Bridge Watcher Service
 *
 * Polls the 0G chain (and optionally a LayerZero bridge contract) for
 * incoming deposit events. When a deposit is detected it:
 *   1. Submits a 0G Compute verification job
 *   2. Triggers payout via the custodial hot wallet
 *   3. Anchors an immutable receipt on 0G Storage
 *
 * The watcher runs as a background process. In production it should be
 * run as a separate worker (npm run watcher).
 */

import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { config } from '../config';
import { ogChain } from './ogChain';
import { ogCompute } from './ogCompute';
import { ogStorage } from './ogStorage';
import { BridgeDeposit } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Minimal LayerZero OFT / bridge receive event ABI
const BRIDGE_ABI = [
  // Standard OFT PacketReceived event
  'event OFTReceived(bytes32 indexed guid, uint32 srcEid, address indexed toAddress, uint256 amountReceivedLD)',
  // Generic ERC-20 Transfer from zero (mint on bridge) as fallback
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export type DepositHandler = (deposit: BridgeDeposit) => Promise<void>;

class BridgeWatcherService extends EventEmitter {
  private contract: ethers.Contract | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastProcessedBlock = 0;
  private running = false;

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    if (!config.bridge.contractAddress || config.bridge.contractAddress.startsWith('0x000')) {
      console.warn('[Bridge Watcher] No bridge contract set – running in log-only mode');
      this._startMockMode();
      return;
    }

    this.contract = new ethers.Contract(
      config.bridge.contractAddress,
      BRIDGE_ABI,
      ogChain.provider,
    );

    this.lastProcessedBlock = await ogChain.getBlockNumber();
    console.log(`[Bridge Watcher] Watching from block ${this.lastProcessedBlock}`);

    this.pollTimer = setInterval(() => {
      this._poll().catch((err) =>
        console.error('[Bridge Watcher] Poll error:', err)
      );
    }, config.bridge.pollIntervalMs);
  }

  stop(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.running = false;
    console.log('[Bridge Watcher] Stopped');
  }

  // ─── Polling ───────────────────────────────────────────────────────────────

  private async _poll(): Promise<void> {
    if (!this.contract) return;

    const currentBlock = await ogChain.getBlockNumber();
    if (currentBlock <= this.lastProcessedBlock) return;

    const fromBlock = this.lastProcessedBlock + 1;
    const toBlock = Math.min(currentBlock, fromBlock + 500); // cap range

    console.log(`[Bridge Watcher] Scanning blocks ${fromBlock}–${toBlock}`);

    try {
      // Listen for OFTReceived (LayerZero cross-chain delivery)
      const filter = this.contract.filters.OFTReceived();
      const logs = await this.contract.queryFilter(filter, fromBlock, toBlock);

      for (const log of logs) {
        await this._handleOftReceived(log as ethers.EventLog);
      }
    } catch (err) {
      // OFTReceived may not exist on all bridge contracts – try Transfer
      const filter = this.contract.filters.Transfer(ethers.ZeroAddress);
      const logs = await this.contract.queryFilter(filter, fromBlock, toBlock);
      for (const log of logs) {
        await this._handleTransferMint(log as ethers.EventLog);
      }
    }

    this.lastProcessedBlock = toBlock;
  }

  // ─── Event handlers ────────────────────────────────────────────────────────

  private async _handleOftReceived(log: ethers.EventLog): Promise<void> {
    const { guid, srcEid, toAddress, amountReceivedLD } = log.args as unknown as {
      guid: string;
      srcEid: number;
      toAddress: string;
      amountReceivedLD: bigint;
    };

    const deposit: BridgeDeposit = {
      depositId: uuidv4(),
      fromAddress: ethers.ZeroAddress, // cross-chain: originator not in this log
      toAddress,
      asset: 'USDT',
      amount: ethers.formatUnits(amountReceivedLD, 6),
      sourceChain: String(srcEid),
      blockNumber: log.blockNumber,
      txHash: log.transactionHash,
      detectedAt: Date.now(),
    };

    console.log(`[Bridge Watcher] OFT deposit detected:`, deposit);
    await this._processDeposit(deposit);
  }

  private async _handleTransferMint(log: ethers.EventLog): Promise<void> {
    const { to, value } = log.args as unknown as { from: string; to: string; value: bigint };

    const deposit: BridgeDeposit = {
      depositId: uuidv4(),
      fromAddress: ethers.ZeroAddress,
      toAddress: to,
      asset: 'BRIDGE_TOKEN',
      amount: ethers.formatUnits(value, 18),
      sourceChain: 'unknown',
      blockNumber: log.blockNumber,
      txHash: log.transactionHash,
      detectedAt: Date.now(),
    };

    console.log(`[Bridge Watcher] Mint deposit detected:`, deposit);
    await this._processDeposit(deposit);
  }

  // ─── Core pipeline: detect → verify → payout → receipt ───────────────────

  private async _processDeposit(deposit: BridgeDeposit): Promise<void> {
    this.emit('deposit', deposit);

    // 1. Submit 0G Compute bridge verification job
    let computeJobId = '';
    try {
      const job = await ogCompute.submitBridgeVerification({
        txHash: deposit.txHash,
        sourceChain: deposit.sourceChain,
        expectedAmount: deposit.amount,
        expectedAsset: deposit.asset,
      });
      computeJobId = job.jobId;
      console.log(`[Bridge Watcher] Compute job submitted: ${computeJobId}`);
    } catch (err) {
      console.warn('[Bridge Watcher] Compute verification skipped:', err);
    }

    // 2. Emit payout event (actual payout handled by route/wallet service)
    this.emit('payout_required', {
      deposit,
      computeJobId,
    });

    // 3. Anchor receipt on 0G Storage
    try {
      const receipt = await ogStorage.storeReceipt({
        txId: deposit.depositId,
        userAddress: deposit.toAddress,
        asset: deposit.asset,
        amountIn: deposit.amount,
        amountOut: deposit.amount, // pre-fee; wallet service updates this
        feeAmount: '0',
        sourceChain: deposit.sourceChain,
        destChain: '0G-Newton',
        settlementTxHash: deposit.txHash,
        settledAt: Date.now(),
      });
      console.log(`[Bridge Watcher] Receipt stored: ${receipt.rootHash}`);
      this.emit('receipt_stored', { deposit, storageRootHash: receipt.rootHash });
    } catch (err) {
      console.warn('[Bridge Watcher] Storage receipt skipped:', err);
    }
  }

  // ─── Mock mode (no contract configured) ───────────────────────────────────

  private _startMockMode(): void {
    console.log('[Bridge Watcher] Mock mode – emitting synthetic deposits every 30s');
    setInterval(() => {
      const mock: BridgeDeposit = {
        depositId: uuidv4(),
        fromAddress: '0x0000000000000000000000000000000000000001',
        toAddress: '0x0000000000000000000000000000000000000002',
        asset: 'USDT',
        amount: (Math.random() * 1000).toFixed(2),
        sourceChain: 'ethereum',
        blockNumber: Math.floor(Math.random() * 1000000),
        txHash: '0x' + uuidv4().replace(/-/g, ''),
        detectedAt: Date.now(),
      };
      this.emit('deposit', mock);
    }, 30_000);
  }
}

export const bridgeWatcher = new BridgeWatcherService();

// ─── Standalone entry (npm run watcher) ───────────────────────────────────────

if (require.main === module) {
  console.log('[Bridge Watcher] Starting standalone watcher process...');
  bridgeWatcher.on('deposit', (d: BridgeDeposit) => {
    console.log('[Bridge Watcher] EVENT deposit:', d);
  });
  bridgeWatcher.on('payout_required', (p: unknown) => {
    console.log('[Bridge Watcher] EVENT payout_required:', p);
  });
  bridgeWatcher.on('receipt_stored', (r: unknown) => {
    console.log('[Bridge Watcher] EVENT receipt_stored:', r);
  });
  bridgeWatcher.start().catch(console.error);
}
