import { useAssessment } from '@/store/useAssessment';
import { useUI } from '@/store/useUI';
import { Modal } from '@/components/ui/Modal';
import { deriveBand, effectiveBand, paletteForBand } from '@/lib/risk';

const LABEL: Record<string, string> = { mono: 'var(--font-mono)' };

function Row({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr',
        gap: 12,
        padding: '9px 4px',
        borderBottom: '1px solid rgba(130,95,210,.08)',
      }}
    >
      <span
        style={{
          fontFamily: LABEL.mono,
          fontSize: 10,
          letterSpacing: '.12em',
          color: 'var(--text-muted)',
        }}
      >
        {k}
      </span>
      <span
        style={{
          fontSize: 13,
          color: color ?? 'var(--text-secondary)',
          fontWeight: color ? 600 : 400,
        }}
      >
        {v}
      </span>
    </div>
  );
}

export function RiskDataModal() {
  const jurisdiction = useAssessment((s) => s.entity.jurisdiction);
  const overrideBand = useAssessment((s) => s.overrideBand);
  const close = useUI((s) => s.closeModal);

  const derived = deriveBand(jurisdiction);
  const eff = effectiveBand(jurisdiction, overrideBand);
  const pal = paletteForBand(eff);
  const derivedPal = paletteForBand(derived);

  const legend: { band: 'low' | 'med' | 'high' }[] = [
    { band: 'low' },
    { band: 'med' },
    { band: 'high' },
  ];
  const statusLegend = [
    { label: 'Negative · Low · Low Risk', color: '#3ddc84' },
    { label: 'Pending · Medium · Medium Risk', color: '#e3b341' },
    { label: 'Positive · High · High Risk', color: '#ff5d73' },
  ];

  return (
    <Modal title="Risk data" onClose={close}>
      <Row k="JURISDICTION" v={jurisdiction} />
      <Row
        k="DERIVED BAND"
        v={`${derivedPal.short} — ${derivedPal.label.split(' — ')[1]}`}
        color={derivedPal.color}
      />
      <Row
        k="ANALYST OVERRIDE"
        v={overrideBand ? `${paletteForBand(overrideBand).short} (active)` : 'None'}
        color={overrideBand ? pal.color : undefined}
      />
      <Row k="EFFECTIVE BAND" v={pal.label} color={pal.color} />
      <Row k="RISK SCORE" v={String(pal.score)} color={pal.color} />

      <div
        style={{
          marginTop: 18,
          marginBottom: 8,
          fontFamily: LABEL.mono,
          fontSize: 10,
          letterSpacing: '.14em',
          color: 'var(--text-muted)',
        }}
      >
        BAND → REQUIRED DILIGENCE → SCORE
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {legend.map(({ band }) => {
          const p = paletteForBand(band);
          return (
            <div
              key={band}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: `1px solid ${p.border}`,
                background: p.bg,
                borderRadius: 8,
                padding: '8px 12px',
                color: p.color,
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              <span>{p.label}</span>
              <span style={{ fontFamily: LABEL.mono }}>{p.score}</span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 18,
          marginBottom: 8,
          fontFamily: LABEL.mono,
          fontSize: 10,
          letterSpacing: '.14em',
          color: 'var(--text-muted)',
        }}
      >
        STATUS COLOUR LEGEND
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {statusLegend.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flex: 'none' }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
