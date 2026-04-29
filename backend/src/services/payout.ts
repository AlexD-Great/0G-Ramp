/**
 * payout.ts – on-ramp payout service.
 *
 * Wraps the OGRampPayout treasury contract. The custodial hot wallet is the
 * contract owner; only it can call payout(). The contract holds float,
 * disburses native 0G to user wallets, and emits a Payout event with a memo
 * tying back to the off-chain ramp tx id.
 */

import { ethers } from 'ethers';
import { config } from '../config';
import { ogChain } from './ogChain';

const PAYOUT_ABI = [
  'function payout(address to, uint256 amount, bytes32 memo) external',
  'function paused() external view returns (bool)',
  'function payoutCount() external view returns (uint256)',
  'event Payout(address indexed to, uint256 amount, bytes32 indexed memo, uint256 indexed id)',
];

export type PayoutResult = {
  txHash: string;
  blockNumber: number;
  amount: string;
  to: string;
};

class PayoutService {
  private getContract(): ethers.Contract {
    if (!config.payout.contractAddress) {
      throw new Error('OG_PAYOUT_CONTRACT not configured');
    }
    return new ethers.Contract(config.payout.contractAddress, PAYOUT_ABI, ogChain.getSigner());
  }

  /**
   * Disburse `amount0G` to `to`, tagging the on-chain Payout event with a memo
   * derived from the ramp tx id. memo is bytes32-encoded, max 31 chars.
   */
  async sendPayout(to: string, amount0G: string, txId: string): Promise<PayoutResult> {
    const c = this.getContract();
    const memo = ethers.encodeBytes32String(txId.replace(/-/g, '').slice(0, 31));
    const value = ethers.parseEther(amount0G);

    console.log(`[Payout] Calling contract.payout(${to}, ${amount0G} 0G, memo=${txId.slice(0, 8)}…)`);
    const tx = await c.payout(to, value, memo);
    const receipt = await tx.wait();
    if (!receipt) throw new Error('Payout receipt is null');

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amount: amount0G,
      to,
    };
  }

  async treasuryBalance(): Promise<string> {
    const addr = config.payout.contractAddress;
    if (!addr) return '0';
    return ogChain.getNativeBalance(addr);
  }

  isConfigured(): boolean {
    return !!config.payout.contractAddress;
  }

  contractAddress(): string {
    return config.payout.contractAddress;
  }
}

export const payoutService = new PayoutService();
