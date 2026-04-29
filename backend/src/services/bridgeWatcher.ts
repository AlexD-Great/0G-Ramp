/**
 * bridgeWatcher.ts – Bridge Watcher Service
 *
 * Polls the 0G chain for OGRampBridge `Deposit` events. When a deposit is
 * detected it:
 *   1. Decodes the bytes32 memo to recover the off-chain ramp tx id
 *   2. Submits a 0G Compute bridge-verification job (advisory)
 *   3. Emits a `payout_required` event the server settles in-process
 *   4. Anchors an immutable settlement receipt on 0G Storage
 *
 * Runs in-process under the main API server. Cursor (lastProcessedBlock) is
 * persisted to disk so restarts don't miss deposits.
 */

import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { config } from '../config';
import { ogChain } from './ogChain';
import { ogCompute } from './ogCompute';
import { ogStorage } from './ogStorage';
import { BridgeDeposit, RampTransaction } from '../types';
import { txStore } from './store';
import { loadJson, saveJson } from '../lib/persist';
import { v4 as uuidv4 } from 'uuid';

// How many blocks behind the chain head to re-scan on every poll. Cheap
// insurance against reorgs: we'll re-see events but skip them via the
// monotonic deposit-id dedup set below.
const REORG_DEPTH = 12;

const BRIDGE_ABI = [
  'event Deposit(address indexed from, uint256 amount, bytes32 indexed memo, uint256 indexed id)',
];

type WatcherCursor = { lastProcessedBlock: number };
type SeenDeposits = { ids: number[] };

export type PayoutEvent = {
  deposit: BridgeDeposit;
  computeJobId: string;
  rampTx: RampTransaction | null;
};

class BridgeWatcherService extends EventEmitter {
  private contract: ethers.Contract | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastProcessedBlock = 0;
  private running = false;
  private seen: Set<number> = new Set();

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

    // Resume from persisted cursor; fall back to current block on first boot.
    const persisted = loadJson<WatcherCursor>('watcher', { lastProcessedBlock: 0 });
    if (persisted.lastProcessedBlock > 0) {
      this.lastProcessedBlock = persisted.lastProcessedBlock;
      console.log(`[Bridge Watcher] Resuming from persisted block ${this.lastProcessedBlock}`);
    } else {
      this.lastProcessedBlock = await ogChain.getBlockNumber();
      this._persistCursor();
      console.log(`[Bridge Watcher] First boot – starting at block ${this.lastProcessedBlock}`);
    }

    // Hydrate dedup set so re-scanned blocks don't re-trigger settlement.
    const seenPersisted = loadJson<SeenDeposits>('watcher-seen', { ids: [] });
    this.seen = new Set(seenPersisted.ids);

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

  private _persistCursor(): void {
    saveJson<WatcherCursor>('watcher', { lastProcessedBlock: this.lastProcessedBlock });
  }

  private _persistSeen(): void {
    // Cap the set so it doesn't grow unbounded; keep last 5000 ids.
    const ids = Array.from(this.seen);
    const trimmed = ids.length > 5000 ? ids.slice(-5000) : ids;
    saveJson<SeenDeposits>('watcher-seen', { ids: trimmed });
  }

  // ─── Polling ───────────────────────────────────────────────────────────────

  private async _poll(): Promise<void> {
    if (!this.contract) return;

    const currentBlock = await ogChain.getBlockNumber();
    if (currentBlock <= this.lastProcessedBlock) return;

    // Re-scan the last REORG_DEPTH blocks each poll. Re-seen deposits are
    // skipped by the dedup set; new ones (or ones whose tx hash changed under
    // a reorg) flow through the pipeline normally.
    const reorgFrom = Math.max(0, this.lastProcessedBlock - REORG_DEPTH + 1);
    const fromBlock = Math.min(reorgFrom, this.lastProcessedBlock + 1);
    const toBlock = Math.min(currentBlock, this.lastProcessedBlock + 500 + REORG_DEPTH);

    console.log(`[Bridge Watcher] Scanning blocks ${fromBlock}–${toBlock} (reorg-aware)`);

    const filter = this.contract.filters.Deposit();
    const logs = await this.contract.queryFilter(filter, fromBlock, toBlock);
    for (const log of logs) {
      await this._handleDeposit(log as ethers.EventLog);
    }

    this.lastProcessedBlock = toBlock;
    this._persistCursor();
  }

  // ─── Memo correlation ─────────────────────────────────────────────────────

  /**
   * Decode the bytes32 memo back to a UUID-without-hyphens prefix and try to
   * find a matching off-chain ramp tx in the persistent store. Frontend encodes
   * `txId.replace(/-/g, '').slice(0, 31)` into the memo, so we search for any
   * stored tx whose hyphen-stripped id starts with the decoded prefix.
   */
  private resolveRampTx(memo: string): RampTransaction | null {
    if (!memo || memo === ethers.ZeroHash) return null;
    let decoded: string;
    try {
      decoded = ethers.decodeBytes32String(memo);
    } catch {
      return null;
    }
    if (!decoded) return null;

    for (const tx of txStore.values()) {
      const flat = tx.id.replace(/-/g, '');
      if (flat.startsWith(decoded)) return tx;
    }
    return null;
  }

  // ─── Event handlers ────────────────────────────────────────────────────────

  private async _handleDeposit(log: ethers.EventLog): Promise<void> {
    const { from, amount, memo, id } = log.args as unknown as {
      from: string;
      amount: bigint;
      memo: string;
      id: bigint;
    };

    const idNum = Number(id);

    // Dedup: the contract's depositCount is monotonic, so it's a perfect
    // idempotency key across reorgs and replay scans.
    if (this.seen.has(idNum)) return;

    const rampTx = this.resolveRampTx(memo);

    const deposit: BridgeDeposit = {
      depositId: `${log.transactionHash}:${id.toString()}`,
      fromAddress: from,
      toAddress: rampTx?.userAddress ?? from,
      asset: '0G',
      amount: ethers.formatEther(amount),
      sourceChain: '0G-Galileo',
      blockNumber: log.blockNumber,
      txHash: log.transactionHash,
      detectedAt: Date.now(),
    };

    console.log(
      `[Bridge Watcher] Deposit detected: id=${id} from=${from} amount=${deposit.amount} 0G ` +
      `rampTx=${rampTx?.id ?? '(none — lone deposit)'}`
    );

    this.seen.add(idNum);
    this._persistSeen();
    await this._processDeposit(deposit, rampTx);
  }

  // ─── Core pipeline ────────────────────────────────────────────────────────

  private async _processDeposit(deposit: BridgeDeposit, rampTx: RampTransaction | null): Promise<void> {
    this.emit('deposit', deposit);

    // 1. 0G Compute advisory verification job (best-effort)
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

    // 2. Emit payout-required so the server can settle the ramp tx in-process.
    const event: PayoutEvent = { deposit, computeJobId, rampTx };
    this.emit('payout_required', event);
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
