# 0G Ramp

A custodial on/off-ramp built on the **0G** stack. Every ramp transaction is verified by 0G Compute, settled on 0G Chain, and anchored to 0G Storage — producing a tamper-proof, cryptographically auditable receipt the operator can't alter after the fact.

> **Status:** Testnet (0G Galileo, chain 16602). On-ramp pipeline is end-to-end functional. Fiat payment gateway and off-ramp flows are scaffolded but not wired.

---

## What it does

1. User submits a ramp tx via the frontend (`/terminal`) — this creates an off-chain record and kicks off an AI risk-scoring job on **0G Compute**.
2. User signs an on-chain `deposit(memo)` call to the **OGRampBridge** contract; the memo encodes the off-chain tx id.
3. A backend bridge watcher polls **0G Chain** for `Deposit` events. When it sees one, it decodes the memo and links the deposit to the off-chain tx.
4. Settlement runs: AI risk score is checked (high-risk → failed); a JSON receipt is uploaded to **0G Storage** and the Merkle root is anchored on chain via the Flow contract.
5. The ramp tx is updated with `txHash0G` + `storageRootHash` and marked `settled`. The user can download the receipt or click through to chainscan.

```
┌─────────────────────────────┐                  ┌──────────────────────────────────┐
│  FRONTEND (Next.js 16)      │                  │  0G GALILEO TESTNET (chain 16602)│
│                             │                  │                                  │
│  /          home + status   │                  │  ┌──────────────────────────┐   │
│  /terminal  bridge form ────┼──┐               │  │ OGRampBridge.sol         │   │
│  /node      tx ledger       │  │  signed tx    │  │   deposit(memo) payable  │   │
│  /insight   latest receipt  │  │ ──────────────┼──►   emit Deposit(...)      │   │
│  /kyc       doc upload      │  │               │  └────────────┬─────────────┘   │
│                             │  │               │               │ events           │
│  ethers v6  + MetaMask      │  │               │  ┌────────────▼─────────────┐   │
└──────────────┬──────────────┘  │               │  │ Flow contract (Storage)  │   │
               │  HTTP / JSON    │   RPC poll    │  │   anchors Merkle roots   │   │
               ▼                 │ ◄─────────────┼──┴──────────────────────────┘   │
┌─────────────────────────────┐  │               │  ┌──────────────────────────┐   │
│  BACKEND (Express + TS)     │  │               │  │ 0G Storage indexer       │   │
│                             │  │  RPC / SDK    │  │   immutable blob store   │   │
│  routes/                    │──┼──────────────►│  └──────────────────────────┘   │
│   chain  transactions       │  │               │  ┌──────────────────────────┐   │
│   storage  compute          │  │               │  │ 0G Compute serving net   │   │
│   kyc      payments         │  │               │  │   AI inference + ledger  │   │
│                             │  │               │  └──────────────────────────┘   │
│  services/                  │  │               └──────────────────────────────────┘
│   ogChain    ogStorage      │  │
│   ogCompute  wallet         │  │
│   payout     store          │  │               ┌──────────────────────────────────┐
│                             │  │               │  PERSISTENCE (backend/data/*.json)│
│  bridgeWatcher ─────────────┼──┘               │   transactions.json              │
│   poll → decode memo →      │                  │   watcher.json (cursor)          │
│   compute risk → settle →   │ ◄────────────────┤   watcher-seen.json (dedup)      │
│   anchor 0G Storage receipt │   read / write   └──────────────────────────────────┘
└─────────────────────────────┘
```

---

## Repository layout

```
.
├── backend/      Node 20 + TypeScript + Express. 0G SDK orchestration layer.
├── frontend/     Next.js 16 + React 19 + Tailwind. MetaMask + ethers v6.
├── contracts/    Hardhat workspace for OGRampBridge.sol.
└── README.md
```

### Key files

- [contracts/contracts/OGRampBridge.sol](contracts/contracts/OGRampBridge.sol) — the deposit sink contract
- [backend/src/server.ts](backend/src/server.ts) — Express boot + settlement pipeline
- [backend/src/services/bridgeWatcher.ts](backend/src/services/bridgeWatcher.ts) — on-chain event polling, memo decoding, reorg-aware
- [backend/src/services/ogChain.ts](backend/src/services/ogChain.ts) — ethers wrapper for 0G Chain
- [backend/src/services/ogStorage.ts](backend/src/services/ogStorage.ts) — `@0glabs/0g-ts-sdk` wrapper
- [backend/src/services/ogCompute.ts](backend/src/services/ogCompute.ts) — `@0glabs/0g-serving-broker` wrapper
- [frontend/src/app/terminal/page.tsx](frontend/src/app/terminal/page.tsx) — the bridge UI
- [frontend/src/lib/bridge.ts](frontend/src/lib/bridge.ts) — frontend → contract `deposit()` call

---

## 0G Galileo testnet endpoints

| Resource | Value |
|---|---|
| Chain ID | `16602` |
| RPC | `https://evmrpc-testnet.0g.ai` |
| Explorer | `https://chainscan-galileo.0g.ai` |
| Storage indexer (standard) | `https://indexer-storage-testnet-standard.0g.ai` |
| Storage Flow contract | `0x22E03a6A89B950F1c82ec5e74F8eCa321a105296` |
| Faucet | `https://faucet.0g.ai` (0.1 0G/day) |
| Deployed `OGRampBridge` | `0xf82Fc25C4A72aE6DCB42bB47Bf98a02cA97099a1` |

---

## Local setup

### Prerequisites

- Node 20+
- A funded 0G Galileo wallet (faucet above). For full SDK access (compute + storage uploads) you need ≥ 3.0 0G to open a compute ledger.
- MetaMask with the Galileo network added (the frontend's CONNECT WALLET button auto-adds it).

### 1. Install

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../contracts && npm install   # only if you want to redeploy the contract
```

### 2. Configure backend

Copy `backend/.env.example` to `backend/.env` and fill in:

```bash
PORT=4000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000

# 0G Galileo (chain 16602)
OG_CHAIN_RPC=https://evmrpc-testnet.0g.ai
OG_CHAIN_ID=16602

# Hot wallet — funds storage uploads, compute ledger, and (future) ERC-20 payouts
OG_HOT_WALLET_PRIVATE_KEY=0x...   # MUST include 0x prefix
OG_HOT_WALLET_ADDRESS=0x...

OG_STORAGE_INDEXER_RPC=https://indexer-storage-testnet-standard.0g.ai
OG_STORAGE_FLOW_CONTRACT=0x22E03a6A89B950F1c82ec5e74F8eCa321a105296

# Compute contracts auto-resolved by the broker on chain 16602; leave at 0x000…
OG_COMPUTE_SERVING_CONTRACT=0x0000000000000000000000000000000000000000
OG_COMPUTE_LEDGER_CONTRACT=0x0000000000000000000000000000000000000000

BRIDGE_CONTRACT_ADDRESS=0xf82Fc25C4A72aE6DCB42bB47Bf98a02cA97099a1
PAYOUT_CONTRACT_ADDRESS=0xE325092A271b158C5317a2cdc2A0b531Ac95b743
BRIDGE_POLL_INTERVAL_MS=6000

API_SECRET=local-dev-secret-change-me


```

### 3. Configure frontend

`frontend/.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### 4. Run

Two terminals:

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

Backend boots on `http://localhost:4000`, frontend on `http://localhost:3000`.

### 5. Fund the compute ledger (one-time)

Required for AI risk-scoring + KYC verification. Costs 3 0G (network minimum).

```powershell
Invoke-RestMethod -Uri http://localhost:4000/api/compute/deposit `
  -Method POST `
  -ContentType 'application/json' `
  -Headers @{ 'x-internal-secret' = 'local-dev-secret-change-me' } `
  -Body '{"amount": 3}'
```

Verify on the home page — the **SDK READINESS** panel turns all five cells green when chain, hot wallet, storage SDK, compute ledger, and tx count are all live.

---

## End-to-end test

1. Open http://localhost:3000 → click **CONNECT WALLET** → MetaMask switches/adds Galileo.
2. Navigate to `/terminal`. Address auto-fills.
3. Set asset = `0G`, amount = `0.01`, click **CONFIRM TRANSACTION PAYLOAD**.
4. MetaMask prompts to sign `deposit(bytes32 memo)` to `0xf82F…99a1`. Approve.
5. Within ~6–12 seconds the bridge watcher detects the deposit, decodes the memo, links it to the off-chain tx, anchors a 0G Storage receipt, and marks the tx `settled`.
6. The right-column ledger on `/terminal`, the table on `/node`, and the receipt on `/insight` all update. Click `EXPLORER` on any settled row to view on chainscan.

---

## API reference (backend)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/api/chain/status` | Live block height + chain id |
| GET | `/api/chain/balance/:address` | Native 0G balance |
| GET | `/api/chain/wallet` | Hot wallet status + gas health |
| GET | `/api/chain/tx/:hash` | Tx lookup + explorer URL |
| GET | `/api/compute/services` | List inference providers (may be empty on testnet) |
| GET | `/api/compute/balance` | Compute ledger balance |
| POST | `/api/compute/deposit` | (internal) top-up compute ledger |
| GET | `/api/compute/jobs/:id` | Poll AI job result |
| POST | `/api/storage/upload` | (internal) upload bytes, returns root hash |
| GET | `/api/storage/download/:root` | (internal) download blob |
| GET | `/api/storage/verify/:root` | Check root anchored on chain |
| POST | `/api/kyc/submit` | Submit KYC document (file → 0G Storage + AI verify) |
| GET | `/api/kyc/status/:userId` | Poll KYC verification |
| POST | `/api/transactions/initiate` | Create a ramp tx + spawn AI risk job |
| GET | `/api/transactions/:id` | Fetch tx + compute job result |
| GET | `/api/transactions` | List all (newest first) |
| POST | `/api/transactions/payout` | (internal) trigger ERC-20 payout |

Internal routes require header: `x-internal-secret: <API_SECRET>`.

---

## Frontend routes

| Route | Purpose |
|---|---|
| `/` | Home + live SDK readiness panel |
| `/terminal` | Bridge form + live transaction ticker |
| `/node` | Vault summary + filterable transaction table |
| `/insight` | Latest receipt with explorer link + JSON download |
| `/kyc` | Document submission + verification status |

---

## Smart contract

`OGRampBridge.sol` is a minimal deposit sink that emits one event:

```solidity
event Deposit(
    address indexed from,
    uint256 amount,
    bytes32 indexed memo,
    uint256 indexed id   // monotonic counter, used for dedup
);
```

Deployed on Galileo at `0xf82Fc25C4A72aE6DCB42bB47Bf98a02cA97099a1`.


OGRampPayout.sol for automtating payouts from the custodial wallet.

Deployed on Galileo at '0xE325092A271b158C5317a2cdc2A0b531Ac95b743'

### Redeploy from scratch

```bash
cd contracts
echo "DEPLOYER_PRIVATE_KEY=0x..." > .env
npm run compile
npm run deploy
```

Then update `BRIDGE_CONTRACT_ADDRESS` and Payout Contract Address in `backend/.env`.

> **Note:** chainscan-galileo doesn't currently expose an Etherscan-compatible verification API and Sourcify doesn't list chain 16602, so programmatic contract verification is unavailable. The source is in this repo as the authoritative copy.

---

## Persistence

All state is JSON-file-backed under `backend/data/`:

- `transactions.json` — ramp tx records, write-through on every mutation
- `watcher.json` — bridge watcher cursor (`lastProcessedBlock`)
- `watcher-seen.json` — dedup set of processed deposit ids (capped at 5000)

Restarts are safe: the watcher resumes from the persisted block, txs survive, no deposits are missed during downtime. Swap for SQLite/Postgres for multi-instance production.

---

## Production deploy

### Backend → Render

- Service type: Web Service (Node)
- Root directory: `backend`
- Build: `npm install && npm run build`
- Start: `npm run start`
- Node version: `20`
- Set all env vars from `.env.example`. Mark `OG_HOT_WALLET_PRIVATE_KEY`, payment secrets, and `API_SECRET` as **secrets**.
- Update `FRONTEND_ORIGIN` to the Vercel URL after the frontend ships.

### Frontend → Vercel

- Framework preset: Next.js (auto-detected)
- Root directory: `frontend`
- Set env vars: `NEXT_PUBLIC_BACKEND_URL`, plus any `NEXT_PUBLIC_*` keys for client-side use.

### Order

1. Deploy backend with placeholder `FRONTEND_ORIGIN`.
2. Deploy frontend pointing at the Render URL.
3. Update `FRONTEND_ORIGIN` on Render → redeploy backend (CORS).

---

## What's done

### ✅ Done (P0 + most of P1)

- 0G Chain, Storage, Compute SDK integration
- `OGRampBridge.sol` and `OGRampPayout.sol`deployed + watcher in real mode
- Stripe Payments Webhook configured and Integrated.
- Memo-correlated settlement: on-chain deposit → off-chain ramp tx → 0G Storage receipt
- AI risk gating (high-risk txs blocked, not settled)
- Reorg-aware event scanning + dedup
- File-backed persistence (txs, cursor, dedup set)
- MetaMask connect with auto-add of Galileo network
- KYC flow (frontend + backend, file → 0G Storage + Stripe Identity + 0G Compute verification)

---

## License

MIT.
