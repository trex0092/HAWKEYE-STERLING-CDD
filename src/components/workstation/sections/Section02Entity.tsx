import { useAssessment } from '@/store/useAssessment';
import { COUNTRIES } from '@/data/countries';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LabeledText, LabeledSelect } from '@/components/ui/fields';

export function Section02Entity() {
  const entity = useAssessment((s) => s.entity);
  const setEntity = useAssessment((s) => s.setEntity);
  const setJurisdiction = useAssessment((s) => s.setJurisdiction);

  return (
    <section className="hk-panel">
      <SectionHeader index="02" title="ENTITY IDENTIFICATION" />
      <div className="hk-grid-2">
        <LabeledText
          label="LEGAL ENTITY NAME"
          placeholder="Registered legal name"
          value={entity.legalName}
          onChange={(v) => setEntity({ legalName: v })}
        />
        <LabeledSelect
          label="JURISDICTION & INCORPORATION"
          value={entity.jurisdiction}
          onChange={setJurisdiction}
          options={COUNTRIES}
        />
        <LabeledText
          label="TRADING NAME (IF DIFFERENT)"
          placeholder="Optional"
          value={entity.tradingName}
          onChange={(v) => setEntity({ tradingName: v })}
        />
        <LabeledText
          label="REGISTRATION / LICENCE NO."
          placeholder="Company or trade licence number"
          value={entity.registrationNo}
          onChange={(v) => setEntity({ registrationNo: v })}
        />
        <LabeledText
          label="REGISTERED ADDRESS"
          placeholder="Street, city, country"
          value={entity.registeredAddress}
          onChange={(v) => setEntity({ registeredAddress: v })}
        />
        <LabeledText
          label="WEBSITE / EMAIL"
          placeholder="Optional"
          value={entity.websiteEmail}
          onChange={(v) => setEntity({ websiteEmail: v })}
        />
      </div>
    </section>
  );
}
