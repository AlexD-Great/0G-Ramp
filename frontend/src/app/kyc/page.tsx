'use client';
import { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav';
import Sidebar from '../../components/Sidebar';
import { api, type KycStatus, type KycSubmitInput } from '../../lib/api';
import { useWallet, connectWallet } from '../../lib/wallet';

const EXPLORER = 'https://chainscan-galileo.0g.ai';

type Stage = 'idle' | 'reading-file' | 'submitting' | 'submitted' | 'error';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function KycPage() {
  const wallet = useWallet();
  const [userId, setUserId] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState<KycSubmitInput['documentType']>('passport');
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<{ userId: string; storageRootHash: string; computeJobId: string } | null>(null);
  const [status, setStatus] = useState<KycStatus | null>(null);

  useEffect(() => {
    if (wallet && !userAddress) setUserAddress(wallet);
  }, [wallet, userAddress]);

  // Poll status once submission exists
  useEffect(() => {
    if (!submission) return;
    let alive = true;
    const tick = async () => {
      try {
        const s = await api.kycStatus(submission.userId);
        if (alive) setStatus(s);
      } catch { /* ignore */ }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(id); };
  }, [submission]);

  const onSubmit = async () => {
    setError(null);
    if (!userId.trim()) { setError('User ID required'); return; }
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) { setError('Invalid 0x address'); return; }
    if (fullName.trim().length < 2) { setError('Full name required'); return; }
    if (!file) { setError('Document file required'); return; }

    try {
      setStage('reading-file');
      const documentBase64 = await fileToBase64(file);
      setStage('submitting');
      const resp = await api.submitKyc({ userId, userAddress, documentType, documentBase64, fullName });
      setSubmission({ userId: resp.userId, storageRootHash: resp.storageRootHash, computeJobId: resp.computeJobId });
      setStage('submitted');
    } catch (e) {
      setError((e as Error).message);
      setStage('error');
    }
  };

  const onConnect = async () => {
    try { await connectWallet(); } catch (e) { setError((e as Error).message); }
  };

  const busy = stage === 'reading-file' || stage === 'submitting';

  return (
    <>
      <TopNav brand="ORBIT" active="KYC" />
      <div className="flex" style={{ height: 'calc(100vh - 72px)' }}>
        <Sidebar />
        <div className="page-content flex flex-col gap-8" style={{ padding: '2rem 3rem', maxWidth: '1100px' }}>
          <div>
            <h1 className="display-md text-gradient-purple">IDENTITY VERIFICATION</h1>
            <div className="label-sm mt-2">Document is anchored on 0G Storage; verification runs on 0G Compute.</div>
          </div>

          <div className="flex gap-8">
            <div className="orbit-card ghost-border flex-col" style={{ flex: 1, padding: '2.5rem', background: 'var(--surface-container-low)' }}>
              <h2 className="label-md mb-6" style={{ letterSpacing: '0.15em' }}>SUBMIT DOCUMENT</h2>

              {!wallet && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--rounded-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Connect wallet to auto-fill address.</div>
                  <button onClick={onConnect} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.7rem' }}>CONNECT</button>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <Field label="USER ID">
                  <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user_abc123" style={inputStyle} />
                </Field>
                <Field label="WALLET ADDRESS">
                  <input value={userAddress} onChange={(e) => setUserAddress(e.target.value)} placeholder="0x…" style={inputStyle} />
                </Field>
                <Field label="FULL NAME">
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" style={inputStyle} />
                </Field>
                <Field label="DOCUMENT TYPE">
                  <select value={documentType} onChange={(e) => setDocumentType(e.target.value as KycSubmitInput['documentType'])} style={inputStyle}>
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID</option>
                    <option value="drivers_license">Driver's License</option>
                  </select>
                </Field>
                <Field label="DOCUMENT FILE">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    style={{ ...inputStyle, padding: '0.5rem' }}
                  />
                  {file && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
                      {file.name} · {(file.size / 1024).toFixed(1)} KB
                    </div>
                  )}
                </Field>
              </div>

              <button
                onClick={onSubmit}
                disabled={busy}
                className="btn btn-primary mt-6"
                style={{ padding: '1rem', letterSpacing: '0.3em', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}
              >
                {stage === 'reading-file' ? 'READING FILE…'
                  : stage === 'submitting' ? 'UPLOADING + VERIFYING…'
                  : 'SUBMIT KYC PACKAGE'}
              </button>

              {error && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: 'var(--rounded-sm)', fontSize: '0.75rem', color: '#ff6b6b', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {error}
                </div>
              )}
            </div>

            <div className="orbit-card ghost-border flex-col" style={{ width: '380px', padding: '2.5rem', background: 'var(--surface)' }}>
              <h2 className="label-md mb-6" style={{ letterSpacing: '0.15em' }}>VERIFICATION STATUS</h2>

              {!submission && (
                <div className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>
                  No submission yet. Fill out the form to anchor your document on 0G Storage and run AI verification on 0G Compute.
                </div>
              )}

              {submission && status && (
                <div className="flex flex-col gap-4" style={{ fontSize: '0.75rem' }}>
                  <Row label="VERIFIED" value={status.verified ? 'YES' : 'PENDING'} color={status.verified ? 'var(--primary)' : 'var(--tertiary)'} />
                  <Row label="COMPUTE STATUS" value={status.computeStatus.toUpperCase()} />
                  <Row label="DOC SHA-256" value={status.documentHash} mono />
                  <Row
                    label="STORAGE ROOT"
                    value={status.storageRootHash}
                    mono
                    href={`${EXPLORER}/address/${status.userAddress}`}
                  />
                  <Row label="COMPUTE JOB" value={status.computeJobId} mono />
                  {status.computeResult && (
                    <div style={{ padding: '0.75rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--rounded-sm)', fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--on-surface-variant)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(status.computeResult, null, 2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  background: 'var(--surface-container-lowest)',
  border: '1px solid var(--outline-variant)',
  borderRadius: 'var(--rounded-sm)',
  color: 'var(--on-surface)',
  fontFamily: 'monospace',
  fontSize: '0.875rem',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-sm mb-1">{label}</div>
      {children}
    </div>
  );
}

function Row({ label, value, mono, color, href }: { label: string; value: string; mono?: boolean; color?: string; href?: string }) {
  const inner = (
    <span style={{ fontFamily: mono ? 'monospace' : undefined, color: color ?? 'var(--on-surface)', wordBreak: 'break-all' }}>
      {value}
    </span>
  );
  return (
    <div>
      <div className="label-sm mb-1">{label}</div>
      {href ? <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--tertiary)' }}>{inner}</a> : inner}
    </div>
  );
}
