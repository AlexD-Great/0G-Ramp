'use client';
import { BrowserProvider, Contract, parseEther, encodeBytes32String } from 'ethers';

export const BRIDGE_CONTRACT_ADDRESS = '0xf82Fc25C4A72aE6DCB42bB47Bf98a02cA97099a1';
export const EXPLORER = 'https://chainscan-galileo.0g.ai';

const BRIDGE_ABI = [
  'function deposit(bytes32 memo) external payable',
  'function depositCount() external view returns (uint256)',
  'event Deposit(address indexed from, uint256 amount, bytes32 indexed memo, uint256 indexed id)',
];

function memoFromTxId(txId: string): string {
  // Truncate the UUID to fit in bytes32 (31 chars max as utf-8)
  return encodeBytes32String(txId.replace(/-/g, '').slice(0, 31));
}

export async function depositToBridge(
  amount0G: string,
  txId: string,
): Promise<{ txHash: string; explorerUrl: string }> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet available');
  }
  const provider = new BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 16602) {
    throw new Error(`Wrong chain ${network.chainId}. Switch wallet to 0G Galileo (16602).`);
  }
  const signer = await provider.getSigner();
  const bridge = new Contract(BRIDGE_CONTRACT_ADDRESS, BRIDGE_ABI, signer);
  const memo = memoFromTxId(txId);
  const tx = await bridge.deposit(memo, { value: parseEther(amount0G) });
  await tx.wait();
  return { txHash: tx.hash, explorerUrl: `${EXPLORER}/tx/${tx.hash}` };
}
