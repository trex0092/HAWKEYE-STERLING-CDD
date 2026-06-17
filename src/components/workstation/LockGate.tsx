/**
 * Session lock gate. Shown while `locked`. The passphrase field + UNLOCK button
 * authenticate for real (src/lib/auth.ts); tapping the medallion is the designed
 * "delight" unlock. Enter in the field submits.
 */
import { useState, type CSSProperties } from 'react';
import { useAssessment } from '@/store/useAssessment';
import { authenticate } from '@/lib/auth';
import { OrbitalMedallion } from '@/components/ui/OrbitalMedallion';
import { LockBadge } from '@/components/icons';

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  background:
    'radial-gradient(900px 600px at 70% -10%,rgba(120,60,210,.28),transparent 60%),radial-gradient(700px 500px at 10% 110%,rgba(40,90,200,.2),transparent 60%),rgba(5,6,12,.86)',
  backdropFilter: 'blur(8px)',
};

const card: CSSProperties = {
  width: 520,
  maxWidth: '100%',
  position: 'relative',
  overflow: 'hidden',
  background: 'rgba(13,15,25,.94)',
  border: '1px solid rgba(130,95,210,.3)',
  borderRadius: 20,
  padding: '34px 40px 32px',
  boxShadow: '0 30px 90px rgba(0,0,0,.6)',
};

export function LockGate() {
  const unlock = useAssessment((s) => s.unlock);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await authenticate(passphrase);
    setBusy(false);
    if (result.ok) {
      setPassphrase('');
      unlock();
    } else {
      setError(result.error ?? 'Unable to unlock.');
    }
  }

  return (
    <div style={overlay}>
      <div style={card}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'linear-gradient(90deg,transparent,#e85aff 35%,#7aa6ff 65%,transparent)',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0 8px' }}>
          <OrbitalMedallion
            size={108}
            image="/assets/robot-logo.png"
            imageInset={18}
            objectPosition="50% 28%"
            glow="0 0 40px rgba(176,123,255,.55)"
            breatheS={5}
            onClick={unlock}
            title="Tap me to unlock"
            ariaLabel="Tap the bot to unlock"
            badge={<LockBadge size={14} strokeWidth={2.4} />}
            rings={[
              { inset: 0, width: 1.5, topColor: '#e85aff', rightColor: '#b07bff', durationS: 7 },
              { inset: 10, topColor: 'transparent', bottomColor: '#7aa6ff', leftColor: '#36e0d0', durationS: 10, reverse: true },
              { inset: -6, dashed: true, color: 'rgba(176,123,255,.3)', durationS: 24 },
            ]}
          />
        </div>
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '.2em',
            color: '#8a7bbf',
            marginBottom: 20,
          }}
        >
          TAP THE BOT TO UNLOCK
        </div>

        <h2
          style={{
            margin: '0 0 8px',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '-.01em',
            color: '#eef0f7',
          }}
        >
          Session expired
        </h2>
        <div style={{ fontSize: 15, lineHeight: 1.55, color: '#e3b341', marginBottom: 22 }}>
          Your 1-hour session has ended — please re-enter your passphrase to continue.
        </div>

        <input
          type="password"
          className="hk-input"
          placeholder="Passphrase"
          autoFocus
          value={passphrase}
          onChange={(e) => {
            setPassphrase(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          style={{ fontSize: 15, padding: '15px 18px', borderRadius: 12, marginBottom: error ? 8 : 14 }}
        />

        {error && (
          <div
            role="alert"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: '#ff8a99',
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          style={{
            width: '100%',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: '.14em',
            color: '#dcb3ff',
            background: 'rgba(232,90,255,.08)',
            border: '1px solid rgba(232,90,255,.55)',
            borderRadius: 12,
            padding: 15,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.7 : 1,
            boxShadow: '0 0 22px rgba(232,90,255,.14)',
            transition: 'background .15s ease, box-shadow .15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(232,90,255,.16)';
            e.currentTarget.style.boxShadow = '0 0 32px rgba(232,90,255,.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(232,90,255,.08)';
            e.currentTarget.style.boxShadow = '0 0 22px rgba(232,90,255,.14)';
          }}
        >
          {busy ? 'UNLOCKING…' : 'UNLOCK'}
        </button>
      </div>
    </div>
  );
}
