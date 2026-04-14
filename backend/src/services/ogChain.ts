/**
 * ogChain.ts – 0G Chain (Newton Testnet) service
 *
 * Wraps ethers.js v6 to interact with the 0G EVM-compatible chain.
 * Handles: provider setup, wallet signing, balance queries, tx submission,
 * stablecoin (ERC-20) transfers, and on-chain ledger reads.
 *
 * 0G Newton Testnet
 *   RPC  : https://evmrpc-testnet.0g.ai
 *   Chain: 16600
 *   Explorer: https://chainscan-newton.0g.ai
 */

import { ethers } from 'ethers';
import { config } from '../config';

// Minimal ERC-20 ABI – transfer + balanceOf
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

class OgChainService {
  public readonly provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.ogChain.rpc, {
      chainId: config.ogChain.chainId,
      name: '0g-newton-testnet',
    });

    if (config.hotWallet.privateKey) {
      this.signer = new ethers.Wallet(config.hotWallet.privateKey, this.provider);
      console.log(`[0G Chain] Hot wallet loaded: ${this.signer.address}`);
    } else {
      console.warn('[0G Chain] No hot wallet private key set – read-only mode');
    }
  }

  getSigner(): ethers.Wallet {
    if (!this.signer) {
      throw new Error('Hot wallet not configured (OG_HOT_WALLET_PRIVATE_KEY missing)');
    }
    return this.signer;
  }

  // ─── Chain info ────────────────────────────────────────────────────────────

  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  async getNetwork(): Promise<{ chainId: bigint; name: string }> {
    const net = await this.provider.getNetwork();
    return { chainId: net.chainId, name: net.name };
  }

  // ─── Native token balance (0G/A0GI) ───────────────────────────────────────

  async getNativeBalance(address: string): Promise<string> {
    const raw = await this.provider.getBalance(address);
    return ethers.formatEther(raw);
  }

  async getHotWalletBalance(): Promise<string> {
    const addr = this.getSigner().address;
    return this.getNativeBalance(addr);
  }

  // ─── ERC-20 helpers ────────────────────────────────────────────────────────

  getErc20Contract(tokenAddress: string, withSigner = false): ethers.Contract {
    const runner = withSigner ? this.getSigner() : this.provider;
    return new ethers.Contract(tokenAddress, ERC20_ABI, runner);
  }

  async getTokenBalance(tokenAddress: string, ownerAddress: string): Promise<string> {
    const contract = this.getErc20Contract(tokenAddress);
    const [raw, decimals]: [bigint, bigint] = await Promise.all([
      contract.balanceOf(ownerAddress),
      contract.decimals(),
    ]);
    return ethers.formatUnits(raw, Number(decimals));
  }

  async transferToken(
    tokenAddress: string,
    toAddress: string,
    amount: string,     // human-readable (e.g. "100.5")
  ): Promise<ethers.TransactionReceipt> {
    const contract = this.getErc20Contract(tokenAddress, true);
    const decimals: bigint = await contract.decimals();
    const amountRaw = ethers.parseUnits(amount, Number(decimals));

    const tx: ethers.TransactionResponse = await contract.transfer(toAddress, amountRaw);
    console.log(`[0G Chain] Token transfer submitted: ${tx.hash}`);

    const receipt = await tx.wait();
    if (!receipt) throw new Error('Transfer receipt is null');
    return receipt;
  }

  // ─── Raw ETH/A0GI send ─────────────────────────────────────────────────────

  async sendNative(
    toAddress: string,
    amountEther: string,
  ): Promise<ethers.TransactionReceipt> {
    const signer = this.getSigner();
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amountEther),
    });
    console.log(`[0G Chain] Native send submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    if (!receipt) throw new Error('Send receipt is null');
    return receipt;
  }

  // ─── Tx lookup ─────────────────────────────────────────────────────────────

  async getTransaction(txHash: string): Promise<ethers.TransactionResponse | null> {
    return this.provider.getTransaction(txHash);
  }

  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return this.provider.getTransactionReceipt(txHash);
  }

  explorerUrl(txHash: string): string {
    return `${config.ogChain.explorerUrl}/tx/${txHash}`;
  }
}

export const ogChain = new OgChainService();
