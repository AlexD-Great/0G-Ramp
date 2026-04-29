'use client';
import { useState } from 'react';

/**
 * Simulated Stripe Elements card form. No real Stripe SDK; this fakes the UX
 * of paying with a card. On "Pay", calls the parent's onPay() which is wired
 * to the backend's /api/payments/confirm.
 */

export type StripeCheckoutProps = {
  amountUsd: number;
  amount0G: string;
  onPay: () => Promise<void>;
  onClose: () => void;
};

export default function StripeCheckout({ amountUsd, amount0G, onPay, onClose }: StripeCheckoutProps) {
  const [card, setCard] = useState('4242 4242 4242 4242');
  const [exp, setExp] = useState('12/29');
  const [cvc, setCvc] = useState('123');
  const [name, setName] = useState('Demo User');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const validate = (): string | null => {
    const digits = card.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(digits)) return 'Card number must be 13–19 digits';
    if (!/^\d{2}\/\d{2}$/.test(exp)) return 'Expiry must be MM/YY';
    if (!/^\d{3,4}$/.test(cvc)) return 'CVC must be 3–4 digits';
    if (name.trim().length < 2) return 'Cardholder name required';
    return null;
  };

  const submit = async () => {
    const v = validate();
    if (v) { setErr(v); return; }
    setErr(null);
    setSubmitting(true);
    try {
      // Simulate Stripe network round-trip latency.
      await new Promise((r) => setTimeout(r, 1200));
      await onPay();
      // onPay now handles modal closing after payment completes
    } catch (e) {
      setErr((e as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>SIMULATED CHECKOUT · TESTNET ONLY</div>
            <h2 className="display-sm mt-1">Pay ${amountUsd.toFixed(2)} USD</h2>
            <div className="label-sm mt-1">Receive {amount0G} 0G on Galileo</div>
          </div>
          <button onClick={onClose} disabled={submitting} style={closeBtn} aria-label="Close">×</button>
        </div>

        <div style={stripeBadge}>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--on-surface-variant)' }}>POWERED BY</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#635bff', letterSpacing: '-0.02em' }}>stripe</span>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--tertiary)' }}>SIMULATED</span>
        </div>

        <div className="flex flex-col gap-4 mt-6">
          <Field label="CARD NUMBER">
            <input value={card} onChange={(e) => setCard(e.target.value)} style={inp} placeholder="4242 4242 4242 4242" />
          </Field>
          <div className="flex gap-4">
            <div style={{ flex: 1 }}>
              <Field label="EXPIRY">
                <input value={exp} onChange={(e) => setExp(e.target.value)} style={inp} placeholder="MM/YY" />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="CVC">
                <input value={cvc} onChange={(e) => setCvc(e.target.value)} style={inp} placeholder="123" />
              </Field>
            </div>
          </div>
          <Field label="CARDHOLDER NAME">
            <input value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder="Jane Doe" />
          </Field>
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          className="btn btn-primary w-full mt-6"
          style={{ padding: '1rem', letterSpacing: '0.3em', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? 'PROCESSING PAYMENT…' : `PAY $${amountUsd.toFixed(2)}`}
        </button>

        {err && (
          <div style={errBox}>{err}</div>
        )}

        <div style={{ marginTop: '1rem', padding: '0.5rem 0.75rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--rounded-sm)', fontSize: '0.65rem', color: 'var(--on-surface-variant)', fontFamily: 'monospace' }}>
          ⓘ This is a simulated payment. Any card number is accepted. No real funds move.
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)',
};

const modal: React.CSSProperties = {
  background: 'var(--surface-container)', border: '1px solid var(--outline-variant)',
  borderRadius: 'var(--rounded-md)', padding: '2.5rem', width: '440px', maxWidth: '92vw',
};

const closeBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--on-surface-variant)',
  fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1, padding: '0.25rem 0.5rem',
};

const stripeBadge: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem',
  background: 'var(--surface-container-lowest)', borderRadius: 'var(--rounded-sm)',
  border: '1px solid var(--outline-variant)',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '0.75rem', background: 'var(--surface-container-lowest)',
  border: '1px solid var(--outline-variant)', borderRadius: 'var(--rounded-sm)',
  color: 'var(--on-surface)', fontFamily: 'monospace', fontSize: '0.875rem',
};

const errBox: React.CSSProperties = {
  marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,107,107,0.1)',
  border: '1px solid #ff6b6b', borderRadius: 'var(--rounded-sm)', fontSize: '0.75rem',
  color: '#ff6b6b', fontFamily: 'monospace',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-sm mb-1">{label}</div>
      {children}
    </div>
  );
}
