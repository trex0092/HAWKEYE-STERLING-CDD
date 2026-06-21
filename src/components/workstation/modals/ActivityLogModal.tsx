import { useState } from 'react';
import { useAssessment } from '@/store/useAssessment';
import { useUI } from '@/store/useUI';
import { useToast } from '@/store/useToast';
import { Modal } from '@/components/ui/Modal';
import { downloadText } from '@/lib/download';
import { healthSnapshot } from '@/lib/governance/monitor';
import { can } from '@/lib/security/rbac';

/**
 * Activity log + Governance panel. Beyond the human-readable trail this surfaces
 * the code-only observability layer (MON/PERF/USAGE/DRIFT/ANOM), the tamper-
 * evident audit chain (AUDIT/TRACE) and GDPR data-subject controls — all in the
 * existing modal (no new modules/integrations).
 */
export function ActivityLogModal() {
  const activity = useAssessment((s) => s.activity);
  const role = useAssessment((s) => s.currentRole());
  const sealAuditLog = useAssessment((s) => s.sealAuditLog);
  const verifyAuditLog = useAssessment((s) => s.verifyAuditLog);
  const exportData = useAssessment((s) => s.exportData);
  const eraseAll = useAssessment((s) => s.eraseAll);
  const close = useUI((s) => s.closeModal);
  const toast = useToast((s) => s.show);

  // Snapshot the observability layer on each open/render (reads the telemetry ring).
  const health = healthSnapshot();
  const [integrity, setIntegrity] = useState<string | null>(null);

  async function onSealVerify() {
    await sealAuditLog();
    const result = await verifyAuditLog();
    const msg = result.valid
      ? 'Audit log sealed — integrity verified ✓'
      : `Integrity broken at entry #${result.brokenAt}`;
    setIntegrity(msg);
    toast(msg);
  }

  function onExport() {
    downloadText('hawkeye-cdd-data-export.json', exportData());
    toast('Data export downloaded (GDPR portability).');
  }

  function onErase() {
    if (!confirm('Erase ALL local data (assessment + register + log)? This cannot be undone.'))
      return;
    eraseAll();
    toast('All local data erased (GDPR right to erasure).');
  }

  const pill = (label: string, value: string) => (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
      {label}: <strong style={{ color: 'var(--text-primary)' }}>{value}</strong>
    </span>
  );

  const statusColor =
    health.status === 'healthy' ? '#3ddc84' : health.status === 'degraded' ? '#e3b341' : '#ff5d73';

  return (
    <Modal title="Activity log" onClose={close}>
      {/* Governance / monitoring panel */}
      <div
        style={{
          border: '1px solid rgba(130,95,210,.18)',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: statusColor }} />
          <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            Governance health: {health.status.toUpperCase()}
          </strong>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {pill('AI calls', String(health.performance.aiCalls))}
          {pill('Grounded', `${Math.round(health.performance.groundedRate * 100)}%`)}
          {pill('Accepted', `${Math.round(health.performance.acceptanceRate * 100)}%`)}
          {pill('Avg risk', String(Math.round(health.performance.avgRiskScore)))}
          {pill('Avg latency', `${health.performance.avgLatencyMs}ms`)}
          {pill('Drift', health.drift.drifted ? 'yes' : 'no')}
          {pill('Anomalies', String(health.anomalies.length))}
          {pill('Events', String(health.usage.totalEvents))}
        </div>
        {(health.drift.drifted || health.anomalies.length > 0) && (
          <div style={{ fontSize: 11.5, color: '#e3b341' }}>
            {[...health.drift.reasons, ...health.anomalies.map((a) => a.detail)].join(' · ')}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
          <button
            type="button"
            className="hk-toolbar-btn hk-toolbar-btn--ghost"
            onClick={onSealVerify}
          >
            Seal &amp; verify integrity
          </button>
          {can(role, 'data:export') && (
            <button
              type="button"
              className="hk-toolbar-btn hk-toolbar-btn--ghost"
              onClick={onExport}
            >
              Export my data
            </button>
          )}
          {can(role, 'data:erase') && (
            <button
              type="button"
              className="hk-toolbar-btn hk-toolbar-btn--ghost"
              onClick={onErase}
            >
              Erase all data
            </button>
          )}
        </div>
        {integrity && (
          <div role="status" style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
            {integrity}
          </div>
        )}
      </div>

      {activity.length === 0 ? (
        <div className="hk-modal-empty">
          No activity recorded yet. Actions such as completing, re-assessing, overriding the band,
          or resetting will be logged here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {activity.map((a) => (
            <div
              key={a.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '170px 1fr',
                gap: 12,
                alignItems: 'baseline',
                padding: '9px 4px',
                borderBottom: '1px solid rgba(130,95,210,.08)',
              }}
            >
              <span
                style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}
              >
                {new Date(a.ts).toLocaleString()}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{a.message}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
