import type { CSSProperties } from 'react';
import { useAssessment } from '@/store/useAssessment';
import { SANCTIONS_LISTS, RESULT_OPTIONS } from '@/data/labels';
import { statusColor } from '@/lib/risk';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusSelect } from '@/components/ui/StatusSelect';
import { PlainInput } from '@/components/ui/fields';

const ROW_COLS = 'minmax(0,2.2fr) 140px 150px minmax(0,2fr)';
const dateStyle: CSSProperties = { fontSize: 12, borderRadius: 9, padding: '8px 10px' };
const textStyle: CSSProperties = { fontSize: 13, borderRadius: 9, padding: '8px 10px' };

export function Section03Sanctions() {
  const sanctions = useAssessment((s) => s.sanctions);
  const setSanction = useAssessment((s) => s.setSanction);

  return (
    <section className="hk-panel">
      <SectionHeader index="03" title="SANCTIONS SCREENING" shortHairline />
      {SANCTIONS_LISTS.map((list, i) => {
        const row = sanctions[i];
        return (
          <div key={list} className="hk-row" style={{ gridTemplateColumns: ROW_COLS }}>
            <span className="hk-row-label">{list}</span>
            <StatusSelect
              value={row.result}
              onChange={(v) => setSanction(i, { result: v as typeof row.result })}
              options={RESULT_OPTIONS}
              colorOf={statusColor}
              aria-label={`${list} result`}
            />
            <PlainInput
              mono
              placeholder="dd/mm/yyyy"
              value={row.date}
              onChange={(v) => setSanction(i, { date: v })}
              inputStyle={dateStyle}
              aria-label={`${list} screened date`}
            />
            <PlainInput
              placeholder="Remarks"
              value={row.remarks}
              onChange={(v) => setSanction(i, { remarks: v })}
              inputStyle={textStyle}
              aria-label={`${list} remarks`}
            />
          </div>
        );
      })}
    </section>
  );
}
