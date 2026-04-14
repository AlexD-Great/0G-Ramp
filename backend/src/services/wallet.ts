/**
 * wallet.ts – Custodial Hot Wallet Service
 *
 * Manages the custodial hot wallet used to:
 *   - Receive inbound stablecoin deposits from the bridge
 *   - Dispatch outbound bank-transfer-trigger payouts
 *   - Pay 0G gas fees for storage anchoring
 *
 * The wallet is a standard ethers.js Wallet backed by OG_HOT_WALLET_PRIVATE_KEY.
 * In production, swap the raw key for an HSM / AWS KMS signer.
 */

import { ethers } from 'ethers';
import { ogChain } from './ogChain';
import { ogStorage } from './ogStorage';
import { RampTransaction } from '../types';

// Fee percentage taken on each payout (e.g. 0.5 = 0.5%)
const FEE_BPS = 50; // 50 basis points = 0.5%

export interface PayoutParams {
  txId: string;
  toAddress: string;
  tokenAddress: string;   // ERC-20 stablecoin on 0G chain
  grossAmount: string;    // human-readable gross amount (before fee)
  storageReceiptRoot?: string;
}

export interface PayoutResult {
  txHash: string;
  netAmount: string;
  feeAmount: string;
  explorerUrl: string;
}

class WalletService {
  // ─── Balance queries ───────────────────────────────────────────────────────

  async getNativeBalance(): Promise<string> {
    return ogChain.getHotWalletBalance();
  }

  async getTokenBalance(tokenAddress: string): Promise<string> {
    const signer = ogChain.getSigner();
    return ogChain.getTokenBalance(tokenAddress, signer.address);
  }

  getAddress(): string {
    return ogChain.getSigner().address;
  }

  // ─── Fee calculation ───────────────────────────────────────────────────────

  computeFee(grossAmount: string): { net: string; fee: string } {
    const gross = parseFloat(grossAmount);
    const fee = (gross * FEE_BPS) / 10000;
    const net = gross - fee;
    return {
      net: net.toFixed(6),
      fee: fee.toFixed(6),
    };
  }

  // ─── Payout ────────────────────────────────────────────────────────────────

  /**
   * Transfer stablecoin from the hot wallet to the user's address.
   * Deducts the platform fee before sending.
   */
  async payout(params: PayoutParams): Promise<PayoutResult> {
    const { net, fee } = this.computeFee(params.grossAmount);

    console.log(
      `[Wallet] Payout – to: ${params.toAddress}, gross: ${params.grossAmount}, ` +
      `net: ${net}, fee: ${fee}`
    );

    const receipt = await ogChain.transferToken(
      params.tokenAddress,
      params.toAddress,
      net,
    );

    const result: PayoutResult = {
      txHash: receipt.hash,
      netAmount: net,
      feeAmount: fee,
      explorerUrl: ogChain.explorerUrl(receipt.hash),
    };

    console.log(`[Wallet] Payout settled: ${receipt.hash}`);

    // Anchor the payout confirmation to 0G Storage
    try {
      await ogStorage.storeReceipt({
        txId: params.txId,
        userAddress: params.toAddress,
        asset: params.tokenAddress,
        amountIn: params.grossAmount,
        amountOut: net,
        feeAmount: fee,
        sourceChain: '0G-Newton',
        destChain: '0G-Newton',
        settlementTxHash: receipt.hash,
        settledAt: Date.now(),
      });
    } catch (err) {
      console.warn('[Wallet] Payout receipt storage failed (non-fatal):', err);
    }

    return result;
  }

  /**
   * Build a RampTransaction record from a completed payout.
   */
  buildSettledTransaction(
    partial: Partial<RampTransaction>,
    payout: PayoutResult,
    storageRootHash?: string,
    computeJobId?: string,
  ): RampTransaction {
    const now = Date.now();
    return {
      id: partial.id ?? 'unknown',
      userAddress: partial.userAddress ?? '',
      assetSymbol: partial.assetSymbol ?? 'USDT',
      amountIn: partial.amountIn ?? '0',
      amountOut: payout.netAmount,
      feeAmount: payout.feeAmount,
      sourceChain: partial.sourceChain ?? 'unknown',
      destChain: partial.destChain ?? '0G-Newton',
      txHashSource: partial.txHashSource,
      txHash0G: payout.txHash,
      storageRootHash,
      computeJobId,
      status: 'settled',
      createdAt: partial.createdAt ?? now,
      updatedAt: now,
    };
  }

  // ─── Gas top-up helper ─────────────────────────────────────────────────────

  /**
   * Check if the hot wallet has enough native token for gas.
   * If below threshold, log a warning (in production: trigger an alert).
   */
  async checkGasHealth(thresholdEther = '0.1'): Promise<boolean> {
    const balance = await this.getNativeBalance();
    const ok = parseFloat(balance) >= parseFloat(thresholdEther);
    if (!ok) {
      console.warn(
        `[Wallet] LOW GAS WARNING: balance ${balance} A0GI below threshold ${thresholdEther}`
      );
    }
    return ok;
  }
}

export const wallet = new WalletService();
