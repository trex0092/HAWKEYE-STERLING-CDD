import type { CSSProperties } from 'react';
import { useAssessment } from '@/store/useAssessment';
import { ADVERSE_CATEGORIES, RESULT_OPTIONS } from '@/data/labels';
import { statusColor } from '@/lib/risk';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusSelect } from '@/components/ui/StatusSelect';
import { PlainInput } from '@/components/ui/fields';

const ROW_COLS = 'minmax(0,2.2fr) 140px minmax(0,3fr)';
const textStyle: CSSProperties = { fontSize: 13, borderRadius: 9, padding: '8px 10px' };

export function Section04Adverse() {
  const adverse = useAssessment((s) => s.adverse);
  const setAdverse = useAssessment((s) => s.setAdverse);

  return (
    <section className="hk-panel">
      <SectionHeader index="04" title="ADVERSE MEDIA SCREENING" shortHairline />
      {ADVERSE_CATEGORIES.map((category, i) => {
        const row = adverse[i];
        return (
          <div key={category} className="hk-row" style={{ gridTemplateColumns: ROW_COLS }}>
            <span className="hk-row-label">{category}</span>
            <StatusSelect
              value={row.finding}
              onChange={(v) => setAdverse(i, { finding: v as typeof row.finding })}
              options={RESULT_OPTIONS}
              colorOf={statusColor}
              aria-label={`${category} finding`}
            />
            <PlainInput
              placeholder="Details / source"
              value={row.details}
              onChange={(v) => setAdverse(i, { details: v })}
              inputStyle={textStyle}
              aria-label={`${category} details`}
            />
          </div>
        );
      })}
    </section>
  );
}
