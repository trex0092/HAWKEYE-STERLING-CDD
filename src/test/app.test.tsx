import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { useAssessment } from '@/store/useAssessment';
import { useUI } from '@/store/useUI';
import {
  deriveBand,
  appPalette,
  statusColor,
  levelColor,
  riskColor,
  screeningEscalation,
  effectiveBand,
} from '@/lib/risk';
import { formatCountdown } from '@/lib/format';
import { buildReportModel } from '@/lib/report';
import { getRegister, saveToRegister } from '@/lib/register';
import { buildAsanaTask, sendToAsana } from '@/lib/integrations/asana';
import { buildNarrative } from '@/lib/narrative';

beforeEach(() => {
  // Clean, locked session + empty storage/UI before each test.
  localStorage.clear();
  useAssessment.getState().reset();
  useAssessment.setState({ locked: true, remaining: 3600, activity: [], versions: [] });
  useUI.setState({ modal: null, overrideOpen: false });
});

describe('risk derivation', () => {
  it('maps jurisdictions to bands (with low fallback)', () => {
    expect(deriveBand('United Kingdom')).toBe('low');
    expect(deriveBand('United Arab Emirates')).toBe('med');
    expect(deriveBand('Iran')).toBe('high');
    expect(deriveBand('Atlantis')).toBe('low');
  });

  it('exposes the band palette (label / short / score)', () => {
    expect(appPalette('United Kingdom')).toMatchObject({
      short: 'CDD',
      score: 4,
      label: 'CDD — Customer Due Diligence',
    });
    expect(appPalette('United Arab Emirates')).toMatchObject({ short: 'SDD', score: 21 });
    expect(appPalette('Iran')).toMatchObject({
      short: 'EDD',
      score: 25,
      label: 'EDD — Enhanced Due Diligence',
    });
  });

  it('recolours status values', () => {
    expect(statusColor('Negative')).toBe('#3ddc84');
    expect(statusColor('Pending')).toBe('#e3b341');
    expect(statusColor('Positive')).toBe('#ff5d73');
    expect(levelColor('High')).toBe('#ff5d73');
    expect(riskColor('Medium Risk')).toBe('#e3b341');
  });
});

describe('formatting', () => {
  it('formats the countdown mm:ss', () => {
    expect(formatCountdown(3600)).toBe('60:00');
    expect(formatCountdown(3599)).toBe('59:59');
    expect(formatCountdown(0)).toBe('00:00');
  });
});

describe('report model', () => {
  it('is band-driven and shows placeholders (never invented data) for blanks', () => {
    const low = buildReportModel(useAssessment.getState());
    expect(low.band).toBe('low');
    expect(low.bannerRiskLabel).toBe('Low Risk');
    expect(low.sanctions).toHaveLength(6);
    expect(low.adverse).toHaveLength(7);
    // No fabricated history, entity, person, or "Approved" decision for a blank form.
    expect(low.versions).toHaveLength(0);
    expect(low.entity[0].v).toBe('—'); // legalName blank → neutral placeholder
    expect(low.person[1].v).toBe('—'); // person NAME blank → neutral placeholder
    expect(low.incomplete).toBe(true);
    expect(low.decision).toBe('Pending');
    expect(low.decision).not.toBe('Approved');
    expect(low.disclaimer).toMatch(/not a legal determination/i);

    useAssessment.getState().setJurisdiction('United Arab Emirates');
    const med = buildReportModel(useAssessment.getState());
    expect(med.band).toBe('med');
    expect(med.bandColor).toBe('#b8860b');
  });

  it('clears the incomplete flag once required fields are filled', () => {
    const s = useAssessment.getState();
    s.setAdmin({ referenceNumber: 'RA-2026-001', assessedBy: 'A. Analyst' });
    s.setEntity({ legalName: 'Acme DMCC' });
    s.setPerson(useAssessment.getState().persons[0].id, { name: 'Real Person' });
    s.setSignoff({ preparedBy: 'Prep Arer', approvedBy: 'App Rover' });
    const m = buildReportModel(useAssessment.getState());
    expect(m.incomplete).toBe(false);
    expect(m.entity[0].v).toBe('Acme DMCC');
    expect(m.ref).toBe('RA-2026-001');
  });

  it('colours the decision by the decision value, not the risk band', () => {
    // Low band (green) but a Rejected decision must render red, not green.
    useAssessment.getState().setJurisdiction('United Kingdom');
    useAssessment.getState().setRba({ classification: 'Low Risk', decision: 'Rejected' });
    const m = buildReportModel(useAssessment.getState());
    expect(m.decision).toBe('Rejected');
    expect(m.decisionColor).toBe('#c0392b');
    expect(m.bannerDecisionColor).toBe('#c0392b');
  });
});

describe('screening escalation', () => {
  it('flags confirmed sanctions / adverse / PEP hits (not "Pending")', () => {
    expect(
      screeningEscalation({ sanctions: [{ result: 'Pending' }], adverse: [], persons: [] })
        .escalate,
    ).toBe(false);
    const hit = screeningEscalation({
      sanctions: [{ result: 'Positive' }],
      adverse: [{ finding: 'Positive' }],
      persons: [{ pepStatus: 'PEP' }],
    });
    expect(hit.escalate).toBe(true);
    expect(hit.reasons).toHaveLength(3);
  });

  it('forces the effective band up to EDD and never lower', () => {
    const esc = { escalate: true, reasons: ['Positive sanctions match'] };
    expect(effectiveBand('United Kingdom', null, esc)).toBe('high'); // UK low → high
    expect(effectiveBand('United Kingdom', 'low', esc)).toBe('high'); // a low override can't hold
    expect(effectiveBand('United Kingdom', null, { escalate: false, reasons: [] })).toBe('low');
  });

  it('escalates the report band and exposes the reason', () => {
    useAssessment.getState().setJurisdiction('United Kingdom'); // inherent low
    useAssessment.getState().setSanction(0, { result: 'Positive' });
    const m = buildReportModel(useAssessment.getState());
    expect(m.band).toBe('high');
    expect(m.escalated).toBe(true);
    expect(m.escalationReasons).toContain('Positive sanctions match');
    expect(m.bannerRiskLabel).toBe('High Risk');
  });

  it('raises the EDD alert and pill in the workstation on a hit', async () => {
    useAssessment.setState({ locked: false });
    useAssessment.getState().setSanction(0, { result: 'Positive' });
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText('RISK RAISED TO EDD')).toBeInTheDocument();
    expect(screen.getByText('EDD — Enhanced Due Diligence')).toBeInTheDocument();
  });
});

describe('lock gate (session passphrase)', () => {
  it('rejects a wrong passphrase and unlocks with the correct one', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText('Session expired')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Passphrase');
    fireEvent.change(input, { target: { value: 'wrong-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'UNLOCK' }));

    expect(await screen.findByText(/Incorrect passphrase/)).toBeInTheDocument();
    expect(useAssessment.getState().locked).toBe(true);

    fireEvent.change(input, { target: { value: 'sterling' } });
    fireEvent.click(screen.getByRole('button', { name: 'UNLOCK' }));

    await waitFor(() => expect(screen.queryByText('Session expired')).not.toBeInTheDocument());
    expect(useAssessment.getState().locked).toBe(false);
  });
});

describe('workstation', () => {
  it('renders all nine sections and a band-driven diligence pill', () => {
    useAssessment.setState({ locked: false });
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText('ASSESSMENT ADMINISTRATION')).toBeInTheDocument();
    expect(screen.getByText('ENTITY IDENTIFICATION')).toBeInTheDocument();
    expect(screen.getByText('REVIEW & VERSION CONTROL')).toBeInTheDocument();
    expect(screen.getByText('PRINT / EXPORT PDF')).toBeInTheDocument();

    // UK → CDD
    expect(screen.getByText('CDD — Customer Due Diligence')).toBeInTheDocument();
  });

  it('recolours the diligence band when the jurisdiction changes', async () => {
    useAssessment.setState({ locked: false });
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByDisplayValue('United Kingdom'), {
      target: { value: 'Iran' },
    });

    expect(await screen.findByText('EDD — Enhanced Due Diligence')).toBeInTheDocument();
  });

  it('adds and removes identification persons', () => {
    useAssessment.setState({ locked: false });
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText('INDIVIDUAL #1')).toBeInTheDocument();
    expect(screen.queryByText('INDIVIDUAL #2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add person/ }));
    expect(screen.getByText('INDIVIDUAL #2')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /REMOVE/ })[0]);
    expect(screen.queryByText('INDIVIDUAL #2')).not.toBeInTheDocument();
  });
});

describe('wired actions', () => {
  it('completeAssessment logs an auto-numbered version entry', () => {
    expect(useAssessment.getState().versions).toHaveLength(0);
    useAssessment.getState().completeAssessment();
    const s = useAssessment.getState();
    expect(s.versions).toHaveLength(1);
    expect(s.versions[0]).toMatchObject({
      ver: '01',
      type: 'Initial',
      summary: 'Assessment completed',
    });
    expect(s.completed).toBe(true);
    expect(s.activity.length).toBeGreaterThan(0);
  });

  it('analyst override sets the effective band (over the jurisdiction)', () => {
    useAssessment.getState().setOverrideBand('high'); // jurisdiction is UK (low)
    const m = buildReportModel(useAssessment.getState());
    expect(m.band).toBe('high');
    expect(m.bannerRiskLabel).toBe('High Risk');
  });

  it('reassess stamps today on every sanctions row', () => {
    useAssessment.getState().reassess();
    expect(useAssessment.getState().sanctions.every((r) => r.date !== '')).toBe(true);
  });
});

describe('register persistence', () => {
  it('saves a snapshot and reloads it', () => {
    useAssessment.getState().setAdmin({ referenceNumber: 'RA-TEST-001' });
    useAssessment.getState().setEntity({ legalName: 'Acme DMCC' });
    saveToRegister(useAssessment.getState().snapshot());

    const recs = getRegister();
    expect(recs).toHaveLength(1);
    expect(recs[0].ref).toBe('RA-TEST-001');

    useAssessment.getState().setEntity({ legalName: 'Changed' });
    useAssessment.getState().restore(recs[0].snapshot);
    expect(useAssessment.getState().entity.legalName).toBe('Acme DMCC');
  });
});

describe('analyst override (UI)', () => {
  it('recolours the diligence pill via the override popover', async () => {
    useAssessment.setState({ locked: false });
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText('CDD — Customer Due Diligence')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ANALYST OVERRIDE/ }));
    fireEvent.click(screen.getByRole('button', { name: /EDD — Enhanced/ }));
    expect(await screen.findByText('EDD — Enhanced Due Diligence')).toBeInTheDocument();
  });
});

describe('report view', () => {
  it('renders the 3-page export (incl. narrative) from live state', () => {
    useAssessment.setState({ locked: false });
    render(
      <MemoryRouter initialEntries={['/report']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('HAWKEYE STERLING').length).toBeGreaterThan(0);
    expect(screen.getByText('PAGE 1 OF 3')).toBeInTheDocument();
    expect(screen.getByText('PAGE 2 OF 3')).toBeInTheDocument();
    expect(screen.getByText('PAGE 3 OF 3')).toBeInTheDocument();
    expect(screen.getByText('COMPLIANCE NARRATIVE')).toBeInTheDocument();
    expect(screen.getByText('1. Purpose & Scope')).toBeInTheDocument();
    // UK → low band: appears in the banner and the RBA summary.
    expect(screen.getAllByText('Low Risk').length).toBeGreaterThan(0);
  });
});

describe('asana integration (env-gated)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds a task payload carrying the band and decision', () => {
    const task = buildAsanaTask({
      reference: 'RA-001',
      entity: 'Acme DMCC',
      bandShort: 'EDD',
      bandLabel: 'EDD — Enhanced Due Diligence',
      decision: 'Approved',
      assessedBy: 'Compliance',
    });
    expect(task.name).toContain('RA-001');
    expect(task.name).toContain('Acme DMCC');
    expect(task.band).toBe('EDD');
    expect(task.decision).toBe('Approved');
  });

  const sampleTask = () =>
    buildAsanaTask({
      reference: 'RA-001',
      entity: 'Acme DMCC',
      bandShort: 'CDD',
      bandLabel: 'CDD — Customer Due Diligence',
      decision: 'Pending',
      assessedBy: '',
    });

  it('maps a 503 from the backend to not-configured (drives the JSON fallback)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await sendToAsana(sampleTask());
    expect(result).toEqual({ ok: false, reason: 'not-configured' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/.netlify/functions/asana',
      expect.objectContaining({ method: 'POST' }),
    );
    vi.unstubAllGlobals();
  });

  it('reports ok when the backend creates the task', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await sendToAsana(sampleTask());
    expect(result).toEqual({ ok: true });
    vi.unstubAllGlobals();
  });

  it('reports request-failed on a backend error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await sendToAsana(sampleTask());
    expect(result).toEqual({ ok: false, reason: 'request-failed', detail: 'HTTP 502' });
    vi.unstubAllGlobals();
  });
});

describe('compliance narrative', () => {
  const input = () => {
    const s = useAssessment.getState();
    return {
      admin: s.admin,
      entity: s.entity,
      sanctions: s.sanctions,
      adverse: s.adverse,
      pf: s.pf,
      persons: s.persons,
      rba: s.rba,
      signoff: s.signoff,
      versions: s.versions,
      overrideBand: s.overrideBand,
    };
  };

  it('drafts ten paragraphs and merges entity + assessor', () => {
    useAssessment.getState().setEntity({ legalName: 'Acme DMCC' });
    useAssessment.getState().setAdmin({ assessedBy: 'L. Fernanda' });
    const n = buildNarrative(input());
    expect(n).toHaveLength(10);
    expect(n[0].heading).toBe('1. Purpose & Scope');
    expect(n[0].body).toContain('Acme DMCC');
    expect(n[0].body).toContain('L. Fernanda');
  });

  it('spells out the recorded customer details in the profile paragraph', () => {
    useAssessment.getState().setEntity({
      legalName: 'Acme DMCC',
      registrationNo: '24839',
      registeredAddress: 'JLT, Dubai',
    });
    const pid = useAssessment.getState().persons[0].id;
    useAssessment.getState().setPerson(pid, {
      name: 'Kutluay Furkan Caner',
      designation: 'Shareholder & Manager',
      shares: '100',
      nationality: 'Turkey',
      passportNo: 'U38311219',
    });
    const profile = buildNarrative(input())[1];
    expect(profile.body).toContain('24839');
    expect(profile.body).toContain('JLT, Dubai');
    expect(profile.body).toContain('Kutluay Furkan Caner');
    expect(profile.body).toContain('100%');
    expect(profile.body).toContain('Turkey');
    expect(profile.body).toContain('U38311219');
  });

  it('reads as "not yet recorded" when screening has no date (no fabricated clear screen)', () => {
    const n = buildNarrative(input());
    expect(n[2].body).toMatch(/not yet been recorded/);
  });

  it('injects escalation wording on a positive sanctions match', () => {
    useAssessment.getState().setSanction(0, { result: 'Positive', date: '01/01/2026' });
    const n = buildNarrative(input());
    expect(n[2].body).toMatch(/matches were identified/);
    expect(n[6].body).toMatch(/Enhanced Due Diligence/);
  });

  it('embeds the narrative in the Asana task notes', () => {
    useAssessment.getState().setEntity({ legalName: 'Acme DMCC' });
    const task = buildAsanaTask({
      reference: 'RA-001',
      entity: 'Acme DMCC',
      bandShort: 'CDD',
      bandLabel: 'CDD — Customer Due Diligence',
      decision: 'Pending',
      assessedBy: '',
      narrative: buildNarrative(input()),
    });
    expect(task.name).toContain('Acme DMCC');
    expect(task.notes).toContain('COMPLIANCE NARRATIVE');
    expect(task.notes).toContain('1. Purpose & Scope');
  });
});

describe('session auto-lock', () => {
  it('ticks down while unlocked and auto-locks at zero', () => {
    useAssessment.setState({ locked: false, remaining: 1 });
    useAssessment.getState().tick();
    expect(useAssessment.getState().remaining).toBe(0);
    expect(useAssessment.getState().locked).toBe(true);

    // Once locked, the clock holds at zero.
    useAssessment.getState().tick();
    expect(useAssessment.getState().remaining).toBe(0);

    // Unlocking restores a fresh 60-minute session.
    useAssessment.getState().unlock();
    expect(useAssessment.getState().locked).toBe(false);
    expect(useAssessment.getState().remaining).toBe(3600);
  });
});

describe('report model hardening', () => {
  it('does not crash when screening arrays are short/empty (safe defaults)', () => {
    const base = useAssessment.getState();
    const model = buildReportModel({ ...base, sanctions: [], adverse: [], pf: [] });
    expect(model.sanctions).toHaveLength(6);
    expect(model.adverse).toHaveLength(7);
    expect(model.pf).toHaveLength(6);
    // A missing screening row reads as "Pending" (not yet screened) — never
    // "Negative", which would falsely imply a completed, clear screen.
    expect(model.sanctions[0].result).toBe('Pending');
    expect(model.adverse[0].find).toBe('Pending');
    expect(model.pf[0].level).toBe('Low');
  });
});

describe('reset integrity', () => {
  it('restores clean defaults but preserves admin + sign-off, and logs it', () => {
    useAssessment.getState().setAdmin({ referenceNumber: 'RA-KEEP-9' });
    useAssessment.getState().setSignoff({ preparedBy: 'Alice Approver' });
    useAssessment.getState().setEntity({ legalName: 'Temp Co', jurisdiction: 'Iran' });
    useAssessment.getState().addPerson();
    useAssessment.getState().setOverrideBand('high');

    useAssessment.getState().reset();
    const s = useAssessment.getState();

    // Entity/persons/override return to clean defaults.
    expect(s.entity.legalName).toBe('');
    expect(s.entity.jurisdiction).toBe('United Kingdom');
    expect(s.persons).toHaveLength(1);
    expect(s.overrideBand).toBeNull();
    expect(s.completed).toBe(false);
    // Admin + sign-off survive a reset.
    expect(s.admin.referenceNumber).toBe('RA-KEEP-9');
    expect(s.signoff.preparedBy).toBe('Alice Approver');
    // The reset is recorded in the activity log.
    expect(s.activity[0].message).toMatch(/reset/i);
  });
});

describe('accessibility', () => {
  function renderWorkstation() {
    useAssessment.setState({ locked: false });
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
  }

  it('programmatically links form labels to their controls', () => {
    renderWorkstation();
    const legalName = screen.getByLabelText('LEGAL ENTITY NAME');
    expect(legalName.tagName).toBe('INPUT');
    fireEvent.change(legalName, { target: { value: 'Acme DMCC' } });
    expect(useAssessment.getState().entity.legalName).toBe('Acme DMCC');

    expect(screen.getByLabelText('JURISDICTION & INCORPORATION').tagName).toBe('SELECT');
  });

  it('renders section titles as level-2 headings beneath the page h1', () => {
    renderWorkstation();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /ENTITY IDENTIFICATION/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(9);
  });

  it('labels the session countdown as a timer', () => {
    renderWorkstation();
    expect(screen.getByRole('timer', { name: /session time remaining/i })).toBeInTheDocument();
  });

  it('gives the modal dialog an accessible name', () => {
    renderWorkstation();
    fireEvent.click(screen.getByRole('button', { name: 'ACTIVITY LOG' }));
    expect(screen.getByRole('dialog', { name: 'Activity log' })).toBeInTheDocument();
  });
});
