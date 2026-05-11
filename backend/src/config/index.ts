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

  // ─── 0G Galileo Testnet ──────────────────────────────────────────────────
  ogChain: {
    rpc: optional('OG_CHAIN_RPC', 'https://evmrpc-testnet.0g.ai'),
    chainId: parseInt(optional('OG_CHAIN_ID', '16602'), 10),
    explorerUrl: 'https://chainscan-galileo.0g.ai',
  },

  // ─── 0G Storage (Galileo) ────────────────────────────────────────────────
  ogStorage: {
    indexerRpc: optional(
      'OG_STORAGE_INDEXER_RPC',
      'https://indexer-storage-testnet-standard.0g.ai'
    ),
    flowContract: optional(
      'OG_STORAGE_FLOW_CONTRACT',
      '0x22E03a6A89B950F1c82ec5e74F8eCa321a105296'
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

  // ─── Payout (on-ramp settlement) ─────────────────────────────────────────
  payout: {
    contractAddress: optional('OG_PAYOUT_CONTRACT', ''),
    usdPerOg: parseFloat(optional('USD_PER_OG', '1')),
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
  // Required: gates internalOnly routes (payout, storage upload/download,
  // compute deposit). MUST be a high-entropy random string in every env.
  apiSecret: required('API_SECRET'),

  // ─── Firebase (Auth + Firestore) ─────────────────────────────────────────
  // Either supply FIREBASE_SERVICE_ACCOUNT (full JSON, single line) OR the
  // three split vars (PROJECT_ID + CLIENT_EMAIL + PRIVATE_KEY). Render makes
  // the split form easier; for local dev the JSON form is more compact.
  firebase: {
    serviceAccountJson: optional('FIREBASE_SERVICE_ACCOUNT', ''),
    projectId: optional('FIREBASE_PROJECT_ID', ''),
    clientEmail: optional('FIREBASE_CLIENT_EMAIL', ''),
    privateKey: optional('FIREBASE_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
  },
} as const;
