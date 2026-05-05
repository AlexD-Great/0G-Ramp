

import { createZGComputeNetworkBroker, ZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';
import { ethers } from 'ethers';
import { config } from '../config';
import { ogChain } from './ogChain';
import { ComputeJobResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

// In-memory job store – replace with Redis/DB in production
const jobStore = new Map<string, ComputeJobResult>();

class OgComputeService {
  // ─── Broker factory ────────────────────────────────────────────────────────

  /**
   * Create a broker instance bound to the hot wallet signer.
   * The broker auto-detects testnet contract addresses from the chain ID.
   */
  private async getBroker(): Promise<ZGComputeNetworkBroker> {
    const signer = ogChain.getSigner();
    // Pass explicit testnet addresses if configured, otherwise auto-detect
    return createZGComputeNetworkBroker(
      signer,
      config.ogCompute.ledgerContract !== '0x0000000000000000000000000000000000000000'
        ? config.ogCompute.ledgerContract
        : undefined,
      config.ogCompute.servingContract !== '0x0000000000000000000000000000000000000000'
        ? config.ogCompute.servingContract
        : undefined,
    );
  }

  // ─── Ledger management ─────────────────────────────────────────────────────

  /**
   * Create / top-up the on-chain ledger that funds inference requests.
   * `addLedger` only works once (first-time creation). For subsequent top-ups
   * we use `depositFund`. Try the cheap path first (deposit) and fall back to
   * create-if-missing if it errors with "account does not exist".
   * @param amount - Amount in 0G tokens (e.g. 0.1 for 0.1 A0GI)
   */
  async depositLedger(amount: number): Promise<void> {
    const broker = await this.getBroker();
    try {
      await broker.ledger.depositFund(amount);
      console.log(`[0G Compute] Deposited ${amount} A0GI into existing ledger`);
    } catch (err) {
      const msg = String(err);
      if (/does not exist|not found|no.*account/i.test(msg)) {
        await broker.ledger.addLedger(amount);
        console.log(`[0G Compute] Created ledger with ${amount} A0GI`);
      } else {
        throw err;
      }
    }
  }

  async getLedgerBalance(): Promise<string> {
    const broker = await this.getBroker();
    const ledger = await broker.ledger.getLedger();
    return ledger ? ethers.formatEther(ledger.availableBalance ?? 0n) : '0';
  }

  // ─── Service discovery ─────────────────────────────────────────────────────

  async listServices(): Promise<Array<{ provider: string; model: string; url: string }>> {
    const broker = await this.getBroker();
    const services = await broker.inference.listService();
    return (services ?? []).map((s: { provider: string; model: string; url?: string }) => ({
      provider: s.provider,
      model: s.model,
      url: s.url ?? '',
    }));
  }

  // ─── Core inference call ───────────────────────────────────────────────────

  /**
   * Send a prompt to the first available provider on the 0G Compute network.
   * Uses billing headers signed by the hot wallet.
   */
  private async infer(prompt: string): Promise<string> {
    const broker = await this.getBroker();
    const services = await broker.inference.listService();

    if (!services?.length) {
      throw new Error('No 0G Compute inference providers available on testnet');
    }

    const providerAddress: string = services[0].provider;

    // Get the OpenAI-compatible endpoint and model name
    const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);

    // Generate billing headers – these act as on-chain settlement proof
    const headers = await broker.inference.getRequestHeaders(providerAddress, prompt);

    // Make the OpenAI-compatible chat completion request
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Inference request failed (${response.status}): ${text}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      id?: string;
    };

    // Process the response for billing reconciliation
    const chatId = data.id ?? '';
    const usage = JSON.stringify(data);
    await broker.inference.processResponse(providerAddress, chatId, usage).catch(() => {});

    return data.choices?.[0]?.message?.content ?? '';
  }

  // ─── Job submission ────────────────────────────────────────────────────────

  async submitKycVerification(params: {
    userId: string;
    documentSha256: string;
    storageRootHash: string;
    documentType: string;
  }): Promise<ComputeJobResult> {
    const jobId = `kyc_${uuidv4()}`;
    const job: ComputeJobResult = { jobId, status: 'running' };
    jobStore.set(jobId, job);

    this._runJob(jobId, [
      'You are a compliance verification engine.',
      `Document type: ${params.documentType}`,
      `Document SHA-256: ${params.documentSha256}`,
      `0G Storage root hash: ${params.storageRootHash}`,
      'Task: Confirm document integrity. Return ONLY a JSON object:',
      '{"verified": boolean, "confidence": number, "flags": string[]}',
    ].join(' ')).catch(console.error);

    return job;
  }

  async submitRiskScore(params: {
    txId: string;
    userAddress: string;
    amountUsd: number;
    sourceChain: string;
    destChain: string;
  }): Promise<ComputeJobResult> {
    const jobId = `risk_${uuidv4()}`;
    const job: ComputeJobResult = { jobId, status: 'running' };
    jobStore.set(jobId, job);

    this._runJob(jobId, [
      'You are an AML risk scoring engine.',
      `Transaction ID: ${params.txId}`,
      `User address: ${params.userAddress}`,
      `Amount USD: ${params.amountUsd}`,
      `Source chain: ${params.sourceChain} → ${params.destChain}`,
      'Task: Return ONLY a JSON object:',
      '{"riskScore": number, "riskLevel": "low"|"medium"|"high", "flags": string[]}',
    ].join(' ')).catch(console.error);

    return job;
  }

  async submitBridgeVerification(params: {
    txHash: string;
    sourceChain: string;
    expectedAmount: string;
    expectedAsset: string;
  }): Promise<ComputeJobResult> {
    const jobId = `bridge_${uuidv4()}`;
    const job: ComputeJobResult = { jobId, status: 'running' };
    jobStore.set(jobId, job);

    this._runJob(jobId, [
      'You are a cross-chain bridge proof verifier.',
      `Transaction hash: ${params.txHash}`,
      `Source chain: ${params.sourceChain}`,
      `Expected: ${params.expectedAmount} ${params.expectedAsset}`,
      'Task: Return ONLY a JSON object:',
      '{"valid": boolean, "confirmedAmount": string, "confirmedAsset": string, "message": string}',
    ].join(' ')).catch(console.error);

    return job;
  }

  // ─── Job status polling ────────────────────────────────────────────────────

  getJobResult(jobId: string): ComputeJobResult | null {
    return jobStore.get(jobId) ?? null;
  }

  // ─── Internal runner ──────────────────────────────────────────────────────

  private async _runJob(jobId: string, prompt: string): Promise<void> {
    const stored = jobStore.get(jobId);
    if (!stored) return;

    try {
      const text = await this.infer(prompt);
      stored.status = 'completed';
      stored.computedAt = Date.now();
      try {
        stored.result = JSON.parse(text);
      } catch {
        stored.result = { raw: text };
      }
      console.log(`[0G Compute] Job ${jobId} completed`);
    } catch (err) {
      stored.status = 'failed';
      stored.error = String(err);
      console.error(`[0G Compute] Job ${jobId} failed:`, err);
    }
  }
}

export const ogCompute = new OgComputeService();
