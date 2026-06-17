import { useAssessment } from '@/store/useAssessment';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LabeledText } from '@/components/ui/fields';

export function Section08Signoff() {
  const signoff = useAssessment((s) => s.signoff);
  const setSignoff = useAssessment((s) => s.setSignoff);

  return (
    <section className="hk-panel">
      <SectionHeader index="08" title="SIGN-OFF & AUTHORIZATION" shortHairline />
      <div className="hk-grid-4" style={{ gap: 10 }}>
        <LabeledText
          label="PREPARED BY"
          placeholder="Name"
          value={signoff.preparedBy}
          onChange={(v) => setSignoff({ preparedBy: v })}
        />
        <LabeledText
          label="PREPARED - ROLE"
          value={signoff.preparedRole}
          onChange={(v) => setSignoff({ preparedRole: v })}
        />
        <LabeledText
          label="APPROVED BY"
          placeholder="Name"
          value={signoff.approvedBy}
          onChange={(v) => setSignoff({ approvedBy: v })}
        />
        <LabeledText
          label="APPROVED - ROLE"
          value={signoff.approvedRole}
          onChange={(v) => setSignoff({ approvedRole: v })}
        />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-faint)',
          marginTop: 14,
          lineHeight: 1.6,
        }}
      >
        Record retention: retain this assessment and supporting documents for a minimum of{' '}
        <span style={{ color: '#9aa3b8' }}>10 years</span>.
      </div>
    </section>
  );
}
