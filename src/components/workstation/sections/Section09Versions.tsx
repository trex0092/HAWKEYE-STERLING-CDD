import { useAssessment } from '@/store/useAssessment';
import { SectionHeader } from '@/components/ui/SectionHeader';

const COLS = '60px 130px minmax(0,1.4fr) 130px minmax(0,2fr)';

export function Section09Versions() {
  const versions = useAssessment((s) => s.versions);

  return (
    <section className="hk-panel">
      <SectionHeader index="09" title="REVIEW & VERSION CONTROL" shortHairline />
      {versions.length > 0 ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: COLS,
              gap: 10,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '.08em',
              color: 'var(--text-muted)',
              padding: '0 4px 10px',
              borderBottom: '1px solid rgba(130,95,210,.18)',
            }}
          >
            <span>VER.</span>
            <span>DATE</span>
            <span>BY</span>
            <span>TYPE</span>
            <span>SUMMARY</span>
          </div>
          {versions.map((v) => (
            <div
              key={v.ver}
              style={{
                display: 'grid',
                gridTemplateColumns: COLS,
                gap: 10,
                alignItems: 'center',
                fontSize: 13,
                color: 'var(--text-secondary)',
                padding: '11px 4px',
                borderBottom: '1px solid rgba(130,95,210,.08)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', color: '#aab2c8' }}>{v.ver}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v.date}</span>
              <span>{v.by}</span>
              <span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    letterSpacing: '.06em',
                    color: 'var(--magenta-bright)',
                    background: 'rgba(232,90,255,.12)',
                    border: '1px solid rgba(232,90,255,.3)',
                    borderRadius: 6,
                    padding: '3px 8px',
                  }}
                >
                  {v.type}
                </span>
              </span>
              <span>{v.summary}</span>
            </div>
          ))}
        </>
      ) : (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-faint)',
            lineHeight: 1.6,
            padding: 4,
          }}
        >
          No reviews logged yet — a timestamped, auto-numbered entry will appear here once the first
          review is logged.
        </div>
      )}
    </section>
  );
}
