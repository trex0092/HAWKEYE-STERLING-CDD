import { useAssessment } from '@/store/useAssessment';
import { RBA_OPTIONS, CDD_LEVEL_OPTIONS, DECISION_OPTIONS } from '@/data/labels';
import { riskColor } from '@/lib/risk';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusSelect } from '@/components/ui/StatusSelect';
import { LabeledSelect } from '@/components/ui/fields';

export function Section07Rba() {
  const rba = useAssessment((s) => s.rba);
  const setRba = useAssessment((s) => s.setRba);

  return (
    <section className="hk-panel">
      <SectionHeader index="07" title="RISK-BASED ASSESSMENT (RBA)" shortHairline />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr) auto',
          gap: 10,
          alignItems: 'end',
        }}
      >
        <div>
          <label className="hk-label">OVERALL RISK CLASSIFICATION</label>
          <StatusSelect
            big
            value={rba.classification}
            onChange={(v) => setRba({ classification: v as typeof rba.classification })}
            options={RBA_OPTIONS}
            colorOf={riskColor}
            aria-label="Overall risk classification"
          />
        </div>
        <LabeledSelect
          label="CDD LEVEL REQUIRED"
          value={rba.cddLevel}
          onChange={(v) => setRba({ cddLevel: v })}
          options={CDD_LEVEL_OPTIONS}
        />
        <LabeledSelect
          label="RELATIONSHIP DECISION"
          value={rba.decision}
          onChange={(v) => setRba({ decision: v })}
          options={DECISION_OPTIONS}
        />
        <label className="hk-check" style={{ paddingBottom: 12 }}>
          <input
            type="checkbox"
            checked={rba.triggerEvents}
            onChange={(e) => setRba({ triggerEvents: e.target.checked })}
          />
          Trigger events present
        </label>
      </div>
    </section>
  );
}
