import type { CSSProperties } from 'react';
import { useAssessment } from '@/store/useAssessment';
import { PF_FACTORS, LEVEL_OPTIONS } from '@/data/labels';
import { levelColor } from '@/lib/risk';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusSelect } from '@/components/ui/StatusSelect';
import { PlainInput } from '@/components/ui/fields';

const ROW_COLS = 'minmax(0,2.2fr) 140px minmax(0,3fr)';
const textStyle: CSSProperties = { fontSize: 13, borderRadius: 9, padding: '8px 10px' };

export function Section06Pf() {
  const pf = useAssessment((s) => s.pf);
  const setPf = useAssessment((s) => s.setPf);

  return (
    <section className="hk-panel">
      <SectionHeader index="06" title="PROLIFERATION FINANCING (PF) ASSESSMENT" shortHairline />
      {PF_FACTORS.map((factor, i) => {
        const row = pf[i];
        return (
          <div key={factor} className="hk-row" style={{ gridTemplateColumns: ROW_COLS }}>
            <span className="hk-row-label">{factor}</span>
            <StatusSelect
              value={row.level}
              onChange={(v) => setPf(i, { level: v as typeof row.level })}
              options={LEVEL_OPTIONS}
              colorOf={levelColor}
              aria-label={`${factor} level`}
            />
            <PlainInput
              placeholder="Assessment notes"
              value={row.notes}
              onChange={(v) => setPf(i, { notes: v })}
              inputStyle={textStyle}
              aria-label={`${factor} notes`}
            />
          </div>
        );
      })}
    </section>
  );
}
