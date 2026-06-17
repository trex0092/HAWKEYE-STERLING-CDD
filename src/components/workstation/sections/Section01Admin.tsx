import { useAssessment } from '@/store/useAssessment';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LabeledText } from '@/components/ui/fields';

const monoSm = { fontFamily: 'var(--font-mono)', fontSize: 13 } as const;

export function Section01Admin() {
  const admin = useAssessment((s) => s.admin);
  const setAdmin = useAssessment((s) => s.setAdmin);

  return (
    <section className="hk-panel">
      <SectionHeader index="01" title="ASSESSMENT ADMINISTRATION" />
      <div className="hk-grid-3">
        <LabeledText
          label="REFERENCE NUMBER"
          mono
          value={admin.referenceNumber}
          onChange={(v) => setAdmin({ referenceNumber: v })}
          inputStyle={monoSm}
        />
        <LabeledText
          label="ASSESSMENT DATE"
          mono
          value={admin.assessmentDate}
          onChange={(v) => setAdmin({ assessmentDate: v })}
          inputStyle={monoSm}
        />
        <LabeledText
          label="NEXT REVIEW DATE"
          mono
          value={admin.nextReviewDate}
          onChange={(v) => setAdmin({ nextReviewDate: v })}
          inputStyle={monoSm}
        />
      </div>
      <div className="hk-grid-2" style={{ marginTop: 12 }}>
        <LabeledText
          label="ASSESSED BY"
          placeholder="Full name"
          value={admin.assessedBy}
          onChange={(v) => setAdmin({ assessedBy: v })}
        />
        <LabeledText
          label="ROLE / DEPARTMENT"
          placeholder="e.g. Compliance Officer"
          value={admin.role}
          onChange={(v) => setAdmin({ role: v })}
        />
      </div>
    </section>
  );
}
