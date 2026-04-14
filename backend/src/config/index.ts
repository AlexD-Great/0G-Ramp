import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  server: {
    port: parseInt(optional('PORT', '4000'), 10),
    env: optional('NODE_ENV', 'development'),
    frontendOrigin: optional('FRONTEND_ORIGIN', 'http://localhost:3000'),
  },

  // ─── 0G Newton Testnet ───────────────────────────────────────────────────
  ogChain: {
    rpc: optional('OG_CHAIN_RPC', 'https://evmrpc-testnet.0g.ai'),
    chainId: parseInt(optional('OG_CHAIN_ID', '16600'), 10),
    explorerUrl: 'https://chainscan-newton.0g.ai',
  },

  // ─── 0G Storage ──────────────────────────────────────────────────────────
  ogStorage: {
    indexerRpc: optional(
      'OG_STORAGE_INDEXER_RPC',
      'https://indexer-storage-testnet-standard.0g.ai'
    ),
    // Flow contract on 0G Newton Testnet
    flowContract: optional(
      'OG_STORAGE_FLOW_CONTRACT',
      '0xbD2C3F0E65eDF5582141C35969d66e205f5cc79'
    ),
  },

  // ─── 0G Compute ──────────────────────────────────────────────────────────
  ogCompute: {
    servingContract: optional(
      'OG_COMPUTE_SERVING_CONTRACT',
      '0x0000000000000000000000000000000000000000'
    ),
    ledgerContract: optional(
      'OG_COMPUTE_LEDGER_CONTRACT',
      '0x0000000000000000000000000000000000000000'
    ),
  },

  // ─── Hot Wallet ───────────────────────────────────────────────────────────
  hotWallet: {
    privateKey: optional('OG_HOT_WALLET_PRIVATE_KEY', ''),
    address: optional('OG_HOT_WALLET_ADDRESS', ''),
  },

  // ─── Bridge ───────────────────────────────────────────────────────────────
  bridge: {
    contractAddress: optional('BRIDGE_CONTRACT_ADDRESS', ''),
    pollIntervalMs: parseInt(optional('BRIDGE_POLL_INTERVAL_MS', '6000'), 10),
  },

  // ─── Payment Gateways ─────────────────────────────────────────────────────
  stripe: {
    secretKey: optional('STRIPE_SECRET_KEY', ''),
    webhookSecret: optional('STRIPE_WEBHOOK_SECRET', ''),
  },
  paystack: {
    secretKey: optional('PAYSTACK_SECRET_KEY', ''),
    webhookSecret: optional('PAYSTACK_WEBHOOK_SECRET', ''),
  },

  // ─── Security ─────────────────────────────────────────────────────────────
  apiSecret: optional('API_SECRET', 'dev-secret'),
} as const;
