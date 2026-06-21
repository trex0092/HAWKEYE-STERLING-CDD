import type { CSSProperties } from 'react';
import { useAssessment } from '@/store/useAssessment';
import { useUI } from '@/store/useUI';
import { ADVERSE_CATEGORIES, RESULT_OPTIONS } from '@/data/labels';
import { statusColor } from '@/lib/risk';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusSelect } from '@/components/ui/StatusSelect';
import { PlainInput } from '@/components/ui/fields';
import { AiCopilot } from '@/components/icons';

const ROW_COLS = 'minmax(0,2.2fr) 140px minmax(0,3fr)';
const textStyle: CSSProperties = { fontSize: 13, borderRadius: 9, padding: '8px 10px' };

export function Section04Adverse() {
  const adverse = useAssessment((s) => s.adverse);
  const setAdverse = useAssessment((s) => s.setAdverse);
  const openModal = useUI((s) => s.openModal);

  return (
    <section className="hk-panel">
      <SectionHeader index="04" title="ADVERSE MEDIA SCREENING" shortHairline />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button
          type="button"
          className="hk-btn-add"
          onClick={() => openModal('ai-triage')}
          title="Summarise pasted adverse-media text with the AI Co-pilot (suggestion only)"
        >
          <AiCopilot size={13} /> AI triage
        </button>
      </div>
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
