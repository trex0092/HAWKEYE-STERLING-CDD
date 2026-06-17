/**
 * Right rail: band-driven avatar medallion, Required-Diligence pill, and the 8
 * action cells + autosaved stamp. Avatar robot/rings/glow + pill colour all
 * follow the jurisdiction-derived band.
 */
import { useNavigate } from 'react-router-dom';
import type { CSSProperties, ReactNode } from 'react';
import { useAssessment } from '@/store/useAssessment';
import { appPalette } from '@/lib/risk';
import { formatClock } from '@/lib/format';
import { OrbitalMedallion } from '@/components/ui/OrbitalMedallion';
import { ActionCell } from '@/components/ui/ActionCell';
import { useToast } from '@/components/ui/Toast';
import {
  PrintExport,
  Complete,
  Register,
  ActivityLog,
  SendToAsana,
  Reset,
  ReAssess,
  RiskData,
  Diligence,
  Override,
} from '@/components/icons';

interface CellConfig {
  key: string;
  icon: ReactNode;
  label: string;
  color: string;
  bg: string;
  bgHover: string;
  border: string;
  onClick: () => void;
}

export function Sidebar() {
  const navigate = useNavigate();
  const jurisdiction = useAssessment((s) => s.entity.jurisdiction);
  const now = useAssessment((s) => s.now);
  const reset = useAssessment((s) => s.reset);
  const showToast = useToast((s) => s.show);

  const pal = appPalette(jurisdiction);
  const ICON = 15;

  const bandVars = {
    ['--band-color']: pal.color,
    ['--band-bg']: pal.bg,
    ['--band-border']: pal.border,
  } as CSSProperties;

  const cells: CellConfig[] = [
    {
      key: 'print',
      icon: <PrintExport size={ICON} />,
      label: 'PRINT / EXPORT PDF',
      color: '#c4a3ff',
      bg: 'rgba(176,123,255,.1)',
      bgHover: 'rgba(176,123,255,.2)',
      border: 'rgba(176,123,255,.4)',
      onClick: () => navigate('/report', { state: { autoprint: true } }),
    },
    {
      key: 'complete',
      icon: <Complete size={ICON} />,
      label: 'COMPLETE ASSESSMENT',
      color: '#3ddc84',
      bg: 'rgba(61,220,132,.1)',
      bgHover: 'rgba(61,220,132,.2)',
      border: 'rgba(61,220,132,.4)',
      onClick: () => showToast('Assessment marked complete.'),
    },
    {
      key: 'register',
      icon: <Register size={ICON} />,
      label: 'REGISTER',
      color: '#f48bff',
      bg: 'rgba(244,139,255,.08)',
      bgHover: 'rgba(244,139,255,.18)',
      border: 'rgba(244,139,255,.4)',
      onClick: () => showToast('Opening assessment register…'),
    },
    {
      key: 'activity',
      icon: <ActivityLog size={ICON} />,
      label: 'ACTIVITY LOG',
      color: '#e3b341',
      bg: 'rgba(227,179,65,.1)',
      bgHover: 'rgba(227,179,65,.2)',
      border: 'rgba(227,179,65,.4)',
      onClick: () => showToast('Activity log is not yet wired to a backend.'),
    },
    {
      key: 'asana',
      icon: <SendToAsana size={ICON} />,
      label: 'SEND TO ASANA',
      color: '#7aa6ff',
      bg: 'rgba(122,166,255,.1)',
      bgHover: 'rgba(122,166,255,.2)',
      border: 'rgba(122,166,255,.4)',
      onClick: () => showToast('Queued for Asana sync.'),
    },
    {
      key: 'reset',
      icon: <Reset size={ICON} />,
      label: 'RESET',
      color: '#ff5d73',
      bg: 'rgba(255,93,115,.08)',
      bgHover: 'rgba(255,93,115,.18)',
      border: 'rgba(255,93,115,.4)',
      onClick: () => {
        reset();
        showToast('Assessment reset to clean defaults.');
      },
    },
    {
      key: 'reassess',
      icon: <ReAssess size={ICON} />,
      label: 'RE-ASSESS',
      color: '#36e0d0',
      bg: 'rgba(54,224,208,.1)',
      bgHover: 'rgba(54,224,208,.2)',
      border: 'rgba(54,224,208,.4)',
      onClick: () => showToast('Risk band re-derived from current inputs.'),
    },
    {
      key: 'riskdata',
      icon: <RiskData size={ICON} />,
      label: 'RISK DATA',
      color: '#c9c24a',
      bg: 'rgba(201,194,74,.1)',
      bgHover: 'rgba(201,194,74,.2)',
      border: 'rgba(201,194,74,.4)',
      onClick: () => showToast('Risk data sources…'),
    },
  ];

  return (
    <div className="hk-sidebar">
      {/* Avatar */}
      <div className="hk-avatar-panel">
        <OrbitalMedallion
          size={224}
          image={pal.img}
          imageInset={20}
          objectPosition="50% 22%"
          glow={`0 0 42px ${pal.glow}`}
          breatheS={6}
          ariaLabel={`Risk band ${pal.short}`}
          rings={[
            { inset: 0, width: 1.5, topColor: pal.color, rightColor: pal.color, durationS: 9 },
            { inset: 12, bottomColor: '#e85aff', leftColor: '#7b5bff', durationS: 12, reverse: true },
            { inset: -7, dashed: true, color: pal.border, durationS: 26 },
          ]}
        />
      </div>

      {/* Required diligence */}
      <div className="hk-rail-panel hk-diligence-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '.16em',
              color: 'var(--text-muted)',
            }}
          >
            REQUIRED DILIGENCE
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: 'linear-gradient(90deg,#e85aff,rgba(54,224,208,.25),transparent)',
            }}
          />
        </div>
        <div className="hk-diligence-pill" style={bandVars}>
          <Diligence size={15} strokeWidth={2.2} />
          {pal.label}
        </div>
        <div className="hk-override">
          <Override size={13} strokeWidth={2.2} />
          ANALYST OVERRIDE
        </div>
      </div>

      {/* Actions */}
      <div className="hk-rail-panel hk-actions-panel">
        {cells.map((c) => (
          <ActionCell
            key={c.key}
            icon={c.icon}
            label={c.label}
            color={c.color}
            bg={c.bg}
            bgHover={c.bgHover}
            border={c.border}
            onClick={c.onClick}
          />
        ))}
        <div className="hk-autosaved">Autosaved {formatClock(now)}</div>
      </div>
    </div>
  );
}
