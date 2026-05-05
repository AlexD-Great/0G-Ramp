'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TopNav from '../../components/TopNav';
import Sidebar from '../../components/Sidebar';
import AuthGate from '../../components/AuthGate';
import { api, type MyKycStatus } from '../../lib/api';

const KYC_LABEL: Record<MyKycStatus['kycStatus'], { text: string; color: string }> = {
  none:      { text: 'NOT STARTED',  color: 'var(--on-surface-variant)' },
  submitted: { text: 'AWAITING USER', color: 'var(--tertiary)' },
  verifying: { text: 'PROCESSING',   color: 'var(--tertiary)' },
  verified:  { text: 'VERIFIED',     color: 'var(--primary)' },
  rejected:  { text: 'REJECTED',     color: '#ff6b6b' },
};

export default function KycPage() {
  return (
    <>
      <TopNav brand="ORBIT" active="KYC" />
      <div className="flex" style={{ height: 'calc(100vh - 72px)' }}>
        <Sidebar />
        <div className="page-content flex flex-col gap-8" style={{ padding: '2rem 3rem', maxWidth: '900px', flex: 1, overflowY: 'auto' }}>
          <AuthGate>
            <Suspense fallback={null}>
              <KycInner />
            </Suspense>
          </AuthGate>
        </div>
      </div>
    </>
  );
}

function KycInner() {
  const search = useSearchParams();
  const [status, setStatus] = useState<MyKycStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returningFromStripe = search.get('status') === 'complete';

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await api.myKyc();
        if (alive) setStatus(s);
      } catch { /* ignore */ }
    };
    tick();
    const id = setInterval(tick, returningFromStripe ? 2000 : 6000);
    return () => { alive = false; clearInterval(id); };
  }, [returningFromStripe]);

  const onStart = async () => {
    setError(null);
    setBusy(true);
    try {
      const { url } = await api.startKyc();
      if (!url) throw new Error('Stripe Identity did not return a URL');
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const verified = status?.kycStatus === 'verified';
  const inFlight = status?.kycStatus === 'submitted' || status?.kycStatus === 'verifying';
  const rejected = status?.kycStatus === 'rejected';
  const kycInfo = status ? KYC_LABEL[status.kycStatus] : KYC_LABEL.none;

  const buttonLabel = busy
    ? 'OPENING STRIPE…'
    : verified
      ? 'RE-VERIFY IDENTITY'
      : inFlight
        ? 'CONTINUE VERIFICATION'
        : rejected
          ? 'TRY AGAIN'
          : 'START VERIFICATION';

  return (
    <>
      <div>
        <div className="label-sm text-gradient-purple mb-2">IDENTITY VERIFICATION</div>
        <h1 className="display-md">PROVE WHO YOU ARE</h1>
        <div className="label-sm mt-2">Verification is handled by Stripe Identity. You&apos;ll be redirected to upload a government ID and a selfie.</div>
      </div>

      <div className="orbit-card ghost-border" style={{ padding: '2.5rem', background: 'var(--surface-container-low)' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="label-md" style={{ letterSpacing: '0.15em' }}>STATUS</h2>
          <span style={{ color: kycInfo.color, fontSize: '0.8rem', letterSpacing: '0.1em' }}>{kycInfo.text}</span>
        </div>

        {verified && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(120, 220, 150, 0.08)', border: '1px solid var(--primary)', borderRadius: 'var(--rounded-sm)' }}>
            <div className="label-sm mb-1" style={{ color: 'var(--primary)' }}>IDENTITY CONFIRMED</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
              You can now on-ramp{status?.kycVerifiedAt ? ` (verified ${new Date(status.kycVerifiedAt).toLocaleString()})` : ''}.
            </div>
          </div>
        )}

        {inFlight && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255, 200, 100, 0.08)', border: '1px solid var(--tertiary)', borderRadius: 'var(--rounded-sm)' }}>
            <div className="label-sm mb-1" style={{ color: 'var(--tertiary)' }}>VERIFICATION IN PROGRESS</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
              {status?.kycStatus === 'submitted'
                ? 'You started a session but haven\'t completed it yet. Use the button below to resume.'
                : 'Stripe is reviewing your documents. This page auto-refreshes — usually done within a minute.'}
            </div>
          </div>
        )}

        {rejected && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: 'var(--rounded-sm)' }}>
            <div className="label-sm mb-1" style={{ color: '#ff6b6b' }}>VERIFICATION FAILED</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
              {status?.kycRejectReason ? `Reason: ${status.kycRejectReason}` : 'Stripe could not verify your documents.'} Try again with a clearer image.
            </div>
          </div>
        )}

        <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          You&apos;ll need:
          <br />• A government-issued ID (passport, driver&apos;s licence, or national ID card)
          <br />• A device with a camera for the live selfie capture
        </p>

        <button
          onClick={onStart}
          disabled={busy}
          className="btn btn-primary"
          style={{ padding: '1rem 2rem', letterSpacing: '0.3em', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          {buttonLabel}
        </button>

        {error && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: 'var(--rounded-sm)', fontSize: '0.75rem', color: '#ff6b6b', fontFamily: 'monospace' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--rounded-sm)', fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>
          ⓘ Test mode — Stripe accepts test documents listed at{' '}
          <a href="https://docs.stripe.com/identity/how-sessions-work#test" target="_blank" rel="noreferrer" style={{ color: 'var(--tertiary)' }}>
            docs.stripe.com/identity
          </a>.
        </div>
      </div>
    </>
  );
}
