/**
 * CDD Assessment Report — the printable 2-page A4 export, rendered from live
 * assessment state. Reached via the PRINT / EXPORT PDF action (which auto-opens
 * the print dialog) or directly at /report.
 */
import { useEffect, useRef, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useAssessment } from '@/store/useAssessment';
import { buildReportModel, type KeyValue } from '@/lib/report';
import { PrintExport, Back } from '@/components/icons';

function RSectionHead({ index, title }: { index: string; title: string }) {
  return (
    <div className="hk-r-section-head">
      <span className="hk-r-index">{index}</span>
      <span className="hk-r-title">{title}</span>
      <div className="hk-r-rule" />
    </div>
  );
}

function RKeyValue({ k, v, valueStyle }: { k: string; v: string; valueStyle?: CSSProperties }) {
  return (
    <div>
      <div className="hk-r-kv-label">{k}</div>
      <div className="hk-r-kv-value" style={valueStyle}>
        {v}
      </div>
    </div>
  );
}

const GRID3: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3,1fr)',
  gap: '14px 22px',
  marginBottom: 24,
};
const GRID2: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2,1fr)',
  gap: '14px 22px',
  marginBottom: 24,
};

export function Report() {
  const navigate = useNavigate();
  const location = useLocation();
  // Subscribe only to the assessment data the report renders — not the 1s clock —
  // so it doesn't re-render every second while mounted.
  const data = useAssessment(
    useShallow((s) => ({
      admin: s.admin,
      entity: s.entity,
      sanctions: s.sanctions,
      adverse: s.adverse,
      pf: s.pf,
      persons: s.persons,
      rba: s.rba,
      signoff: s.signoff,
      versions: s.versions,
      overrideBand: s.overrideBand,
    })),
  );
  const m = buildReportModel(data);

  const autoprint = Boolean((location.state as { autoprint?: boolean } | null)?.autoprint);
  const printedRef = useRef(false);

  useEffect(() => {
    if (!autoprint || printedRef.current) return;
    printedRef.current = true;
    let cancelled = false;
    const run = async () => {
      try {
        await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
      } catch {
        /* fonts API unavailable — print anyway */
      }
      await new Promise((r) => setTimeout(r, 350));
      if (!cancelled) window.print();
    };
    void run();
    // Clear the autoprint flag through the router (avoids reprint on refresh
    // without clobbering react-router's history bookkeeping).
    navigate(location.pathname, { replace: true, state: null });
    return () => {
      cancelled = true;
    };
  }, [autoprint, navigate, location.pathname]);

  const SANC_COLS = 'minmax(0,3fr) 100px 110px';
  const ADV_COLS = 'minmax(0,1fr) 100px';
  const PF_COLS = 'minmax(0,1fr) 90px';
  const VER_COLS = '50px 110px minmax(0,1.3fr) 90px minmax(0,1.6fr)';

  const sign1Role = `PREPARED BY · ${(data.signoff.preparedRole || 'Compliance Officer').toUpperCase()}`;
  const sign2Role = `APPROVED BY · ${(data.signoff.approvedRole || 'Managing Director').toUpperCase()}`;

  return (
    <div className="hk-report-surface">
      <div className="hk-report-toolbar">
        <button
          type="button"
          className="hk-toolbar-btn hk-toolbar-btn--ghost"
          onClick={() => navigate('/')}
        >
          <Back size={14} /> Back to workstation
        </button>
        <span className="title">CDD Assessment Report</span>
        <button
          type="button"
          className="hk-toolbar-btn hk-toolbar-btn--primary"
          onClick={() => window.print()}
        >
          <PrintExport size={14} /> Print / Export PDF
        </button>
      </div>

      <div className="hk-report-pages">
        {/* PAGE 1 */}
        <div className="hk-report-page hk-report-page--break">
          <div className="hk-r-header">
            <div className="hk-r-header-bar" />
            <div className="hk-r-logo">
              <img src="/assets/robot-logo.png" alt="" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="hk-r-wordmark">HAWKEYE STERLING</div>
              <div className="hk-r-sub">
                Customer &amp; Counterparty Due Diligence — CDD Assessment Report
              </div>
            </div>
            <div className="hk-r-refblock">
              <div>
                REF <b>{m.ref}</b>
              </div>
              <div>
                DATE <b>{m.date}</b>
              </div>
            </div>
          </div>

          {m.incomplete && (
            <div className="hk-r-draft" role="status">
              DRAFT — one or more required fields are incomplete. This is not a finalised
              assessment.
            </div>
          )}

          <div
            className="hk-r-banner"
            style={{ border: `1px solid ${m.bandBorder}`, background: m.bandBg }}
          >
            <div>
              <div className="hk-r-eyebrow">INHERENT RISK · JURISDICTION-BASED</div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 22,
                  color: m.bandColor,
                  marginTop: 3,
                }}
              >
                {m.bannerRiskLabel}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="hk-r-eyebrow">REQUIRED DILIGENCE · DECISION</div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 15,
                  color: '#15171f',
                  marginTop: 3,
                }}
              >
                {m.cddLabel} ·{' '}
                <span style={{ color: m.bannerDecisionColor }}>{m.bannerDecision}</span>
              </div>
            </div>
          </div>

          <div className="hk-r-body">
            <RSectionHead index="01" title="ASSESSMENT ADMINISTRATION" />
            <div style={GRID3}>
              {m.admin.map((r: KeyValue) => (
                <RKeyValue key={r.k} k={r.k} v={r.v} />
              ))}
            </div>

            <RSectionHead index="02" title="ENTITY IDENTIFICATION" />
            <div style={GRID2}>
              {m.entity.map((r: KeyValue) => (
                <RKeyValue key={r.k} k={r.k} v={r.v} />
              ))}
            </div>

            <RSectionHead index="03" title="SANCTIONS SCREENING" />
            <div style={{ marginBottom: 24 }}>
              <div className="hk-r-row-head" style={{ gridTemplateColumns: SANC_COLS }}>
                <span>LIST</span>
                <span>RESULT</span>
                <span>SCREENED</span>
              </div>
              {m.sanctions.map((r) => (
                <div
                  key={r.list}
                  className="hk-r-row"
                  style={{ gridTemplateColumns: SANC_COLS, padding: '8px 12px' }}
                >
                  <span style={{ color: '#15171f' }}>{r.list}</span>
                  <span className="hk-r-result" style={{ color: r.resultColor }}>
                    {r.result}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#15171f' }}>
                    {r.date}
                  </span>
                </div>
              ))}
            </div>

            <RSectionHead index="04" title="ADVERSE MEDIA SCREENING" />
            <div>
              {m.adverse.map((r) => (
                <div
                  key={r.cat}
                  className="hk-r-row"
                  style={{ gridTemplateColumns: ADV_COLS, padding: '7px 12px' }}
                >
                  <span style={{ color: '#15171f' }}>{r.cat}</span>
                  <span className="hk-r-result" style={{ color: r.findColor }}>
                    {r.find}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="hk-r-footer">
            <span>CONFIDENTIAL · HAWKEYE STERLING COMPLIANCE</span>
            <span>PAGE 1 OF 2</span>
          </div>
        </div>

        {/* PAGE 2 */}
        <div className="hk-report-page">
          <div className="hk-r-body">
            <RSectionHead index="05" title="IDENTIFICATIONS" />
            <div
              style={{
                border: '1px solid #e3e6ec',
                borderRadius: 10,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '.1em',
                  color: '#c026d3',
                  marginBottom: 12,
                }}
              >
                INDIVIDUAL #1
              </div>
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px 22px' }}
              >
                {m.person.map((r: KeyValue) => (
                  <RKeyValue key={r.k} k={r.k} v={r.v} valueStyle={{ fontSize: 12 }} />
                ))}
              </div>
            </div>

            <RSectionHead index="06" title="PROLIFERATION FINANCING (PF) ASSESSMENT" />
            <div style={{ marginBottom: 24 }}>
              {m.pf.map((r) => (
                <div
                  key={r.factor}
                  className="hk-r-row"
                  style={{ gridTemplateColumns: PF_COLS, padding: '7px 12px' }}
                >
                  <span style={{ color: '#15171f' }}>{r.factor}</span>
                  <span className="hk-r-result" style={{ color: r.levelColor }}>
                    {r.level}
                  </span>
                </div>
              ))}
            </div>

            <RSectionHead index="07" title="RISK-BASED ASSESSMENT (RBA)" />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
                gap: 22,
                marginBottom: 24,
              }}
            >
              <RKeyValue
                k="OVERALL RISK (ANALYST RBA)"
                v={m.rbaOverall}
                valueStyle={{ fontSize: 14, fontWeight: 600, color: m.rbaOverallColor }}
              />
              <RKeyValue
                k="CDD LEVEL"
                v={m.cddLevelName}
                valueStyle={{ fontSize: 14, fontWeight: 600 }}
              />
              <RKeyValue
                k="DECISION"
                v={m.decision}
                valueStyle={{ fontSize: 14, fontWeight: 600, color: m.decisionColor }}
              />
            </div>

            <RSectionHead index="08" title="SIGN-OFF & AUTHORIZATION" />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2,1fr)',
                gap: 22,
                marginBottom: 14,
              }}
            >
              <div className="hk-r-sign">
                <div className="hk-r-sign-name">{m.preparedBy}</div>
                <div className="hk-r-sign-role">{sign1Role}</div>
              </div>
              <div className="hk-r-sign">
                <div className="hk-r-sign-name">{m.approvedBy}</div>
                <div className="hk-r-sign-role">{sign2Role}</div>
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: '#b14fd8',
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              Record retention: retain this assessment and supporting documents in line with the
              firm&apos;s records-retention policy and applicable regulatory requirements.
            </div>

            <RSectionHead index="09" title="REVIEW & VERSION CONTROL" />
            <div>
              <div className="hk-r-row-head" style={{ gridTemplateColumns: VER_COLS }}>
                <span>VER</span>
                <span>DATE</span>
                <span>BY</span>
                <span>TYPE</span>
                <span>SUMMARY</span>
              </div>
              {m.versions.length === 0 ? (
                <div
                  className="hk-r-row"
                  style={{ gridTemplateColumns: '1fr', padding: '8px 12px', color: '#6b7280' }}
                >
                  No review history recorded yet.
                </div>
              ) : (
                m.versions.map((v) => (
                  <div
                    key={v.ver}
                    className="hk-r-row"
                    style={{ gridTemplateColumns: VER_COLS, padding: '8px 12px' }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#15171f' }}>
                      {v.ver}
                    </span>
                    <span
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#15171f' }}
                    >
                      {v.date}
                    </span>
                    <span style={{ color: '#15171f' }}>{v.by}</span>
                    <span
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#c026d3' }}
                    >
                      {v.type}
                    </span>
                    <span style={{ color: '#15171f' }}>{v.summary}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="hk-r-disclaimer">{m.disclaimer}</div>

          <div className="hk-r-footer">
            <span>CONFIDENTIAL · HAWKEYE STERLING COMPLIANCE</span>
            <span>PAGE 2 OF 2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
