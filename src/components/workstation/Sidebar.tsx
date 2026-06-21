/**
 * Right rail: band-driven avatar medallion, Required-Diligence pill (+ analyst
 * override popover), and the 8 wired action cells + autosave stamp. The effective
 * band = analyst override ?? jurisdiction-derived band.
 */
import { useNavigate } from 'react-router-dom';
import type { CSSProperties, ReactNode } from 'react';
import { useAssessment } from '@/store/useAssessment';
import { useUI } from '@/store/useUI';
import { useToast } from '@/store/useToast';
import { effectiveBand, paletteForBand, screeningEscalation, type RiskBand } from '@/lib/risk';
import { canExport } from '@/lib/report';
import { formatClock } from '@/lib/format';
import { buildAsanaTask, sendToAsana } from '@/lib/integrations/asana';
import { requestCopilot, narrativeToSource } from '@/lib/integrations/aiCopilot';
import { useAiCopilot } from '@/store/useAiCopilot';
import { buildNarrative } from '@/lib/narrative';
import { downloadJson } from '@/lib/download';
import { OrbitalMedallion } from '@/components/ui/OrbitalMedallion';
import { ActionCell } from '@/components/ui/ActionCell';
import {
  PrintExport,
  Complete,
  Register,
  ActivityLog,
  SendToAsana,
  Reset,
  ReAssess,
  Diligence,
  Override,
  Alert,
  AiCopilot,
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

const OVERRIDE_OPTIONS: { label: string; band: RiskBand | null }[] = [
  { label: 'Auto (jurisdiction)', band: null },
  { label: 'CDD — Customer', band: 'low' },
  { label: 'SDD — Simplified', band: 'med' },
  { label: 'EDD — Enhanced', band: 'high' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const jurisdiction = useAssessment((s) => s.entity.jurisdiction);
  const overrideBand = useAssessment((s) => s.overrideBand);
  const sanctions = useAssessment((s) => s.sanctions);
  const adverse = useAssessment((s) => s.adverse);
  const persons = useAssessment((s) => s.persons);
  const reference = useAssessment((s) => s.admin.referenceNumber);
  const entityName = useAssessment((s) => s.entity.legalName);
  const assessedBy = useAssessment((s) => s.admin.assessedBy);
  const decision = useAssessment((s) => s.rba.decision);
  const lastSavedAt = useAssessment((s) => s.lastSavedAt);

  const reset = useAssessment((s) => s.reset);
  const completeAssessment = useAssessment((s) => s.completeAssessment);
  const reassess = useAssessment((s) => s.reassess);
  const setOverrideBand = useAssessment((s) => s.setOverrideBand);
  const logActivity = useAssessment((s) => s.logActivity);

  const openModal = useUI((s) => s.openModal);
  const copilotBegin = useAiCopilot((s) => s.begin);
  const copilotSucceed = useAiCopilot((s) => s.succeed);
  const copilotFail = useAiCopilot((s) => s.fail);
  const overrideOpen = useUI((s) => s.overrideOpen);
  const toggleOverride = useUI((s) => s.toggleOverride);
  const closeOverride = useUI((s) => s.closeOverride);

  const showToast = useToast((s) => s.show);

  const escalation = screeningEscalation({ sanctions, adverse, persons });
  const band = effectiveBand(jurisdiction, overrideBand, escalation);
  const pal = paletteForBand(band);
  const ICON = 15;

  const bandVars = {
    ['--band-color']: pal.color,
    ['--band-bg']: pal.bg,
    ['--band-border']: pal.border,
  } as CSSProperties;

  const handleAsana = async () => {
    // Read the full assessment for the narrative (the rail subscribes narrowly).
    const s = useAssessment.getState();
    const narrative = buildNarrative({
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
    });
    const task = buildAsanaTask({
      reference,
      entity: entityName,
      bandShort: pal.short,
      bandLabel: pal.label,
      decision,
      assessedBy,
      narrative,
    });
    const result = await sendToAsana(task);
    if (result.ok) {
      logActivity(`Sent "${task.name}" to Asana.`);
      showToast('Sent to Asana.');
    } else if (result.reason === 'not-configured') {
      downloadJson(`asana-task-${reference || 'assessment'}.json`, task);
      logActivity('Exported Asana task payload (no webhook configured).');
      showToast('Asana not configured — exported task as JSON.');
    } else {
      logActivity(`Asana send failed: ${result.detail ?? 'request failed'}.`);
      showToast(`Asana send failed: ${result.detail ?? 'request failed'}.`);
    }
  };

  // AI Co-pilot: rephrase the deterministic narrative into a DRAFT, then open the
  // review modal where the analyst Accepts/edits/Discards it (Layer 5 oversight).
  // It never sets the band or decision; the deterministic narrative stays the
  // authoritative fallback when AI is unconfigured or fails.
  const handleCopilot = async () => {
    const s = useAssessment.getState();
    const narrative = buildNarrative({
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
    });
    copilotBegin();
    openModal('ai-copilot');
    const result = await requestCopilot('narrative-polish', narrativeToSource(narrative), {
      consent: s.consent,
    });
    if (result.ok) {
      copilotSucceed(result.value);
      logActivity(
        `AI Co-pilot drafted narrative (${result.value.model}) — ${result.value.grounded ? 'grounded' : `flagged: ${result.value.ungrounded.join(', ') || 'review'}`}; awaiting analyst review.`,
      );
    } else if (result.reason === 'not-configured') {
      copilotFail('not configured');
      logActivity('AI Co-pilot not configured — kept deterministic narrative.');
    } else if (result.reason === 'consent-required') {
      copilotFail('consent required — enable AI consent in Activity Log → Governance');
      logActivity('AI Co-pilot blocked — GDPR consent not recorded.');
    } else if (result.reason === 'dlp-blocked') {
      copilotFail(`blocked by DLP — secret detected (${result.detail ?? ''})`);
      logActivity(`AI Co-pilot blocked by DLP: ${result.detail ?? 'secret detected'}.`);
    } else {
      copilotFail(result.detail ?? 'request failed');
      logActivity(`AI Co-pilot failed: ${result.detail ?? 'request failed'}.`);
    }
  };

  const cells: CellConfig[] = [
    {
      key: 'print',
      icon: <PrintExport size={ICON} />,
      label: 'PRINT / EXPORT PDF',
      color: '#c4a3ff',
      bg: 'rgba(176,123,255,.1)',
      bgHover: 'rgba(176,123,255,.2)',
      border: 'rgba(176,123,255,.4)',
      onClick: () => {
        if (!canExport(useAssessment.getState().signoff)) {
          showToast('Approval required — name the approving officer (§08) before exporting.');
          return;
        }
        navigate('/report', { state: { autoprint: true } });
      },
    },
    {
      key: 'complete',
      icon: <Complete size={ICON} />,
      label: 'COMPLETE ASSESSMENT',
      color: '#3ddc84',
      bg: 'rgba(61,220,132,.1)',
      bgHover: 'rgba(61,220,132,.2)',
      border: 'rgba(61,220,132,.4)',
      onClick: () => {
        completeAssessment();
        showToast('Assessment completed — version logged.');
      },
    },
    {
      key: 'register',
      icon: <Register size={ICON} />,
      label: 'REGISTER',
      color: '#f48bff',
      bg: 'rgba(244,139,255,.08)',
      bgHover: 'rgba(244,139,255,.18)',
      border: 'rgba(244,139,255,.4)',
      onClick: () => openModal('register'),
    },
    {
      key: 'activity',
      icon: <ActivityLog size={ICON} />,
      label: 'ACTIVITY LOG',
      color: '#e3b341',
      bg: 'rgba(227,179,65,.1)',
      bgHover: 'rgba(227,179,65,.2)',
      border: 'rgba(227,179,65,.4)',
      onClick: () => openModal('activity'),
    },
    {
      key: 'asana',
      icon: <SendToAsana size={ICON} />,
      label: 'SEND TO ASANA',
      color: '#7aa6ff',
      bg: 'rgba(122,166,255,.1)',
      bgHover: 'rgba(122,166,255,.2)',
      border: 'rgba(122,166,255,.4)',
      onClick: () => void handleAsana(),
    },
    {
      key: 'copilot',
      icon: <AiCopilot size={ICON} />,
      label: 'AI NARRATIVE (DRAFT)',
      color: '#b07bff',
      bg: 'rgba(176,123,255,.1)',
      bgHover: 'rgba(176,123,255,.2)',
      border: 'rgba(176,123,255,.4)',
      onClick: () => void handleCopilot(),
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
      onClick: () => {
        reassess();
        showToast('Re-assessed — sanctions re-screened.');
      },
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
            {
              inset: 12,
              bottomColor: '#e85aff',
              leftColor: '#7b5bff',
              durationS: 12,
              reverse: true,
            },
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

        {escalation.escalate && (
          <div className="hk-escalation" role="alert">
            <span className="hk-escalation-icon" aria-hidden="true">
              <Alert size={16} strokeWidth={2.2} />
            </span>
            <div className="hk-escalation-text">
              <div className="hk-escalation-title">RISK RAISED TO EDD</div>
              <div className="hk-escalation-reason">
                {escalation.reasons.join(' · ')} — Enhanced Due Diligence required.
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          className="hk-override"
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            borderTop: '1px solid rgba(130,95,210,.14)',
            textAlign: 'left',
          }}
          aria-expanded={overrideOpen}
          onClick={toggleOverride}
        >
          <Override
            size={13}
            strokeWidth={2.2}
            style={{
              transform: overrideOpen ? 'rotate(90deg)' : 'none',
              transition: 'transform .15s ease',
            }}
          />
          ANALYST OVERRIDE
        </button>

        {overrideOpen && (
          <div className="hk-override-pop">
            {OVERRIDE_OPTIONS.map((opt) => {
              const active = overrideBand === opt.band;
              const optPal = opt.band ? paletteForBand(opt.band) : null;
              const style = optPal
                ? ({ ['--band-color']: optPal.color, ['--band-bg']: optPal.bg } as CSSProperties)
                : undefined;
              return (
                <button
                  key={opt.label}
                  type="button"
                  className="hk-override-opt"
                  data-active={active}
                  style={style}
                  onClick={() => {
                    setOverrideBand(opt.band);
                    closeOverride();
                  }}
                >
                  {opt.label}
                  {active && <span aria-hidden>✓</span>}
                </button>
              );
            })}
          </div>
        )}
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
        <div className="hk-autosaved">
          {lastSavedAt ? `Autosaved ${formatClock(new Date(lastSavedAt))}` : 'Not yet saved'}
        </div>
      </div>
    </div>
  );
}
