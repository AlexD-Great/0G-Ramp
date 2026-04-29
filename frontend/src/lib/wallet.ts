'use client';
import { useEffect, useState } from 'react';

const KEY = 'ogramp.walletAddress';
const EVENT = 'ogramp:wallet-changed';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

const GALILEO_HEX = '0x40DA'; // 16602

export function readStoredAddress(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY);
}

function writeAddress(addr: string | null) {
  if (typeof window === 'undefined') return;
  if (addr) localStorage.setItem(KEY, addr);
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: addr }));
}

export async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No injected wallet found. Install MetaMask.');
  }

  const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
  const addr = accounts?.[0];
  if (!addr) throw new Error('No account returned');

  // Try to switch to Galileo; if not added, add it.
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: GALILEO_HEX }],
    });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: GALILEO_HEX,
          chainName: '0G-Galileo-Testnet',
          nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
          rpcUrls: ['https://evmrpc-testnet.0g.ai'],
          blockExplorerUrls: ['https://chainscan-galileo.0g.ai'],
        }],
      });
    }
  }

  writeAddress(addr);
  return addr;
}

export function disconnectWallet() {
  writeAddress(null);
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    setAddress(readStoredAddress());
    const onChange = (e: Event) => {
      setAddress((e as CustomEvent<string | null>).detail);
    };
    window.addEventListener(EVENT, onChange);
    if (window.ethereum?.on) {
      const handler = (accounts: unknown) => {
        const next = (accounts as string[])?.[0] ?? null;
        writeAddress(next);
      };
      window.ethereum.on('accountsChanged', handler);
      return () => {
        window.removeEventListener(EVENT, onChange);
        window.ethereum?.removeListener?.('accountsChanged', handler);
      };
    }
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return address;
}
