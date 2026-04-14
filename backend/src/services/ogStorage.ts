/**
 * ogStorage.ts – 0G Storage service
 *
 * Uses @0glabs/0g-ts-sdk to upload/download immutable blobs on the
 * 0G decentralized storage network (Newton Testnet).
 *
 * SDK notes (v0.3.x):
 *   - `MemData(buffer)` wraps in-memory bytes into an uploadable file abstraction
 *   - `Indexer.upload(file, rpc, signer, opts)` → returns [{txHash, rootHash}, error]
 *   - `Indexer.download(rootHash, filePath, proof)` → downloads to disk
 *   - Flow contract anchors the Merkle root on-chain
 *
 * Testnet:
 *   Indexer RPC: https://indexer-storage-testnet-standard.0g.ai
 *   Flow contract: 0xbD2C3F0E65eDF5582141C35969d66e205f5cc79
 */

import { Indexer, MemData, getFlowContract, defaultUploadOption } from '@0glabs/0g-ts-sdk';
import * as crypto from 'crypto';
import { config } from '../config';
import { ogChain } from './ogChain';

export interface StorageUploadResult {
  rootHash: string;
  txHash: string;
  size: number;
  sha256: string;
}

class OgStorageService {
  private indexer: Indexer;

  constructor() {
    this.indexer = new Indexer(config.ogStorage.indexerRpc);
  }

  // ─── Core upload ───────────────────────────────────────────────────────────

  async uploadBytes(data: Buffer | Uint8Array): Promise<StorageUploadResult> {
    const signer = ogChain.getSigner();
    const buf = data instanceof Buffer ? data : Buffer.from(data);

    const file = new MemData(buf);
    const [result, err] = await this.indexer.upload(
      file,
      config.ogChain.rpc,
      signer,
      { ...defaultUploadOption, tags: '0x' },
    );

    if (err) throw new Error(`0G Storage upload error: ${err}`);
    if (!result?.rootHash) throw new Error('Upload returned no root hash');

    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    console.log(`[0G Storage] Uploaded ${buf.length}B – root: ${result.rootHash}, tx: ${result.txHash}`);

    return {
      rootHash: result.rootHash,
      txHash: result.txHash ?? '',
      size: buf.length,
      sha256,
    };
  }

  async uploadJson(payload: Record<string, unknown>): Promise<StorageUploadResult> {
    return this.uploadBytes(Buffer.from(JSON.stringify(payload), 'utf-8'));
  }

  // ─── KYC storage ──────────────────────────────────────────────────────────

  async storeKyc(
    userId: string,
    userAddress: string,
    documentBytes: Buffer,
  ): Promise<StorageUploadResult> {
    const sha256 = crypto.createHash('sha256').update(documentBytes).digest('hex');
    console.log(`[0G Storage] Storing KYC for user ${userId}, doc sha256=${sha256}`);

    // Wrap the document bytes with metadata as a JSON envelope
    const envelope = {
      type: 'kyc',
      userId,
      userAddress,
      documentSha256: sha256,
      uploadedAt: Date.now(),
      // documentBytes are base64-encoded inside the envelope
      data: documentBytes.toString('base64'),
    };

    return this.uploadJson(envelope);
  }

  // ─── Receipt storage ───────────────────────────────────────────────────────

  async storeReceipt(receipt: {
    txId: string;
    userAddress: string;
    asset: string;
    amountIn: string;
    amountOut: string;
    feeAmount: string;
    sourceChain: string;
    destChain: string;
    settlementTxHash: string;
    settledAt: number;
  }): Promise<StorageUploadResult> {
    console.log(`[0G Storage] Storing receipt for tx ${receipt.txId}`);
    return this.uploadJson({ type: 'receipt', ...receipt });
  }

  // ─── Download ──────────────────────────────────────────────────────────────

  /**
   * Download a blob by root hash to a temp file, then read it back.
   * The SDK downloads to disk; we read the file and return the buffer.
   */
  async downloadByRoot(rootHash: string): Promise<Buffer> {
    const os = await import('os');
    const path = await import('path');
    const fs = await import('fs');

    const tmpPath = path.join(os.tmpdir(), `0g_dl_${rootHash.slice(0, 8)}_${Date.now()}`);

    const err = await this.indexer.download(rootHash, tmpPath, false);
    if (err) throw new Error(`0G Storage download error: ${err}`);

    const data = fs.readFileSync(tmpPath);
    fs.unlinkSync(tmpPath);
    return data;
  }

  // ─── On-chain verification ────────────────────────────────────────────────

  async verifyRootOnChain(rootHash: string): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer: any = config.hotWallet.privateKey
        ? ogChain.getSigner()
        : ogChain.provider;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flowContract = getFlowContract(config.ogStorage.flowContract, signer as any);
      // Try `contains` or `hasRoot` – method name depends on the deployed ABI version
      const exists: boolean = await (flowContract as unknown as {
        contains: (root: string) => Promise<boolean>;
      }).contains(rootHash).catch(async () => {
        return (flowContract as unknown as {
          hasRoot: (root: string) => Promise<boolean>;
        }).hasRoot(rootHash).catch(() => false);
      });
      return exists;
    } catch {
      return false;
    }
  }
}

export const ogStorage = new OgStorageService();
