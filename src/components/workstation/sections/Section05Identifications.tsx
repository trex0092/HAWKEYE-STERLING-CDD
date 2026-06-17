import type { CSSProperties } from 'react';
import { useAssessment, type Person } from '@/store/useAssessment';
import {
  PERSON_TYPE_OPTIONS,
  PROOF_OF_ADDRESS_OPTIONS,
  PEP_STATUS_OPTIONS,
} from '@/data/labels';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LabeledText, LabeledSelect } from '@/components/ui/fields';
import { AddPerson, RemovePerson } from '@/components/icons';

const textStyle: CSSProperties = { fontSize: 13, borderRadius: 9, padding: '7px 10px' };
const dateStyle: CSSProperties = { fontSize: 12, borderRadius: 9, padding: '7px 10px' };
const selectStyle: CSSProperties = { fontSize: 13, borderRadius: 9, padding: '7px 10px' };

function PersonCard({ person, index, canRemove }: { person: Person; index: number; canRemove: boolean }) {
  const setPerson = useAssessment((s) => s.setPerson);
  const removePerson = useAssessment((s) => s.removePerson);
  const set = (patch: Partial<Person>) => setPerson(person.id, patch);

  return (
    <div
      style={{
        background: 'var(--surface-row)',
        border: '1px solid var(--border-row)',
        borderRadius: 10,
        padding: 11,
        marginBottom: 7,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 7,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '.1em',
            color: 'var(--cyan)',
          }}
        >
          INDIVIDUAL #{index}
        </span>
        {canRemove && (
          <button type="button" className="hk-btn-remove" onClick={() => removePerson(person.id)}>
            <RemovePerson size={11} strokeWidth={2} />
            REMOVE
          </button>
        )}
      </div>
      <div className="hk-grid-4">
        <LabeledText labelSm label="DESIGNATION" placeholder="Shareholder & Director" value={person.designation} onChange={(v) => set({ designation: v })} inputStyle={textStyle} />
        <LabeledText labelSm label="NAME" placeholder="Full legal name" value={person.name} onChange={(v) => set({ name: v })} inputStyle={textStyle} />
        <LabeledText labelSm label="SHARES %" placeholder="100" value={person.shares} onChange={(v) => set({ shares: v })} inputStyle={textStyle} />
        <LabeledSelect labelSm label="TYPE" value={person.type} onChange={(v) => set({ type: v })} options={PERSON_TYPE_OPTIONS} inputStyle={selectStyle} />
        <LabeledText labelSm label="NATIONALITY" value={person.nationality} onChange={(v) => set({ nationality: v })} inputStyle={textStyle} />
        <LabeledText labelSm label="GENDER" value={person.gender} onChange={(v) => set({ gender: v })} inputStyle={textStyle} />
        <LabeledText labelSm mono label="DATE OF BIRTH" placeholder="dd/mm/yyyy" value={person.dob} onChange={(v) => set({ dob: v })} inputStyle={dateStyle} />
        <LabeledText labelSm label="PASSPORT NO." value={person.passportNo} onChange={(v) => set({ passportNo: v })} inputStyle={textStyle} />
        <LabeledText labelSm mono label="PASSPORT EXPIRY" placeholder="dd/mm/yyyy" value={person.passportExpiry} onChange={(v) => set({ passportExpiry: v })} inputStyle={dateStyle} />
        <LabeledText labelSm label="EMIRATES ID" value={person.emiratesId} onChange={(v) => set({ emiratesId: v })} inputStyle={textStyle} />
        <LabeledText labelSm mono label="EMIRATES ID EXPIRY" placeholder="dd/mm/yyyy" value={person.emiratesIdExpiry} onChange={(v) => set({ emiratesIdExpiry: v })} inputStyle={dateStyle} />
        <LabeledSelect labelSm label="PROOF OF ADDRESS" value={person.proofOfAddress} onChange={(v) => set({ proofOfAddress: v })} options={PROOF_OF_ADDRESS_OPTIONS} inputStyle={selectStyle} />
        <LabeledSelect labelSm label="PEP STATUS" value={person.pepStatus} onChange={(v) => set({ pepStatus: v })} options={PEP_STATUS_OPTIONS} inputStyle={selectStyle} />
      </div>
    </div>
  );
}

export function Section05Identifications() {
  const persons = useAssessment((s) => s.persons);
  const addPerson = useAssessment((s) => s.addPerson);

  return (
    <section className="hk-panel">
      <SectionHeader
        index="05"
        title="IDENTIFICATIONS"
        shortHairline
        action={
          <button type="button" className="hk-btn-add" onClick={addPerson}>
            <AddPerson size={13} strokeWidth={2.4} />
            Add person
          </button>
        }
      />
      {persons.map((person, i) => (
        <PersonCard key={person.id} person={person} index={i + 1} canRemove={persons.length > 1} />
      ))}
    </section>
  );
}
