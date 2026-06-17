import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { useAssessment } from '@/store/useAssessment';
import { useUI } from '@/store/useUI';
import { deriveBand, appPalette, statusColor, levelColor, riskColor } from '@/lib/risk';
import { formatCountdown } from '@/lib/format';
import { buildReportModel } from '@/lib/report';
import { getRegister, saveToRegister } from '@/lib/register';

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
  it('is band-driven and falls back to sample descriptive values', () => {
    const low = buildReportModel(useAssessment.getState());
    expect(low.band).toBe('low');
    expect(low.bannerRiskLabel).toBe('Low Risk');
    expect(low.sanctions).toHaveLength(6);
    expect(low.adverse).toHaveLength(7);
    expect(low.versions).toHaveLength(3); // sample fallback when none logged
    expect(low.entity[0].v).toBe('Meridian Bullion Trading DMCC'); // legalName blank → fallback

    useAssessment.getState().setJurisdiction('United Arab Emirates');
    const med = buildReportModel(useAssessment.getState());
    expect(med.band).toBe('med');
    expect(med.bandColor).toBe('#b8860b');
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

describe('lock gate (real auth)', () => {
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
  it('renders the 2-page export from live state', () => {
    useAssessment.setState({ locked: false });
    render(
      <MemoryRouter initialEntries={['/report']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('HAWKEYE STERLING').length).toBeGreaterThan(0);
    expect(screen.getByText('PAGE 1 OF 2')).toBeInTheDocument();
    expect(screen.getByText('PAGE 2 OF 2')).toBeInTheDocument();
    // UK → low band: appears in the banner and the RBA summary.
    expect(screen.getAllByText('Low Risk').length).toBeGreaterThan(0);
  });
});
