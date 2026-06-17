/**
 * Risk-band derivation and the band-driven palettes.
 * The jurisdiction selected in section 02 derives a band, which recolours the
 * avatar, rings/glow, the Required-Diligence pill, and the report banner.
 */
import { RISK, type RiskBand } from '@/data/countries';

export type { RiskBand };

export interface AppPalette {
  band: RiskBand;
  color: string;
  glow: string;
  border: string;
  bg: string;
  /** Required-Diligence pill label, e.g. "CDD — Customer Due Diligence". */
  label: string;
  /** Avatar image (public path). */
  img: string;
  short: 'CDD' | 'SDD' | 'EDD';
  sub: 'CUSTOMER' | 'SIMPLIFIED' | 'ENHANCED';
  /** Risk score shown for the band (4 / 21 / 25). */
  score: number;
}

const APP_PALETTES: Record<RiskBand, AppPalette> = {
  low: {
    band: 'low',
    color: '#3ddc84',
    glow: 'rgba(61,220,132,.5)',
    border: 'rgba(61,220,132,.4)',
    bg: 'rgba(61,220,132,.1)',
    label: 'CDD — Customer Due Diligence',
    img: '/assets/robot-cdd.png',
    short: 'CDD',
    sub: 'CUSTOMER',
    score: 4,
  },
  med: {
    band: 'med',
    color: '#e3b341',
    glow: 'rgba(227,179,65,.5)',
    border: 'rgba(227,179,65,.4)',
    bg: 'rgba(227,179,65,.1)',
    label: 'SDD — Simplified Due Diligence',
    img: '/assets/robot-sdd.png',
    short: 'SDD',
    sub: 'SIMPLIFIED',
    score: 21,
  },
  high: {
    band: 'high',
    color: '#ff5d73',
    glow: 'rgba(255,93,115,.5)',
    border: 'rgba(255,93,115,.4)',
    bg: 'rgba(255,93,115,.1)',
    label: 'EDD — Enhanced Due Diligence',
    img: '/assets/robot-edd.png',
    short: 'EDD',
    sub: 'ENHANCED',
    score: 25,
  },
};

/** Light (report) palette per band. */
export interface ReportPalette {
  color: string;
  border: string;
  bg: string;
}
const REPORT_PALETTES: Record<RiskBand, ReportPalette> = {
  low: { color: '#1f9d57', border: '#bfe6cf', bg: '#eefaf2' },
  med: { color: '#b8860b', border: '#f0e2b8', bg: '#fbf6e6' },
  high: { color: '#c0392b', border: '#f0c6c0', bg: '#fbece9' },
};

/** Per-band names used in the report's RBA summary. */
const BAND_TO_RISK_LABEL: Record<RiskBand, string> = {
  low: 'Low Risk',
  med: 'Medium Risk',
  high: 'High Risk',
};
const BAND_TO_CDD_LEVEL: Record<RiskBand, string> = {
  low: 'Standard CDD',
  med: 'Simplified CDD',
  high: 'Enhanced CDD',
};

export function deriveBand(jurisdiction: string): RiskBand {
  return RISK[jurisdiction] ?? 'low';
}

export function appPalette(jurisdiction: string): AppPalette {
  return APP_PALETTES[deriveBand(jurisdiction)];
}

export function paletteForBand(band: RiskBand): AppPalette {
  return APP_PALETTES[band];
}

/** The band actually in effect: a manual analyst override wins over the derived band. */
export function effectiveBand(jurisdiction: string, override: RiskBand | null): RiskBand {
  return override ?? deriveBand(jurisdiction);
}

export function reportPalette(band: RiskBand): ReportPalette {
  return REPORT_PALETTES[band];
}

export function riskLabelForBand(band: RiskBand): string {
  return BAND_TO_RISK_LABEL[band];
}
export function cddLevelForBand(band: RiskBand): string {
  return BAND_TO_CDD_LEVEL[band];
}

/* ---- Status → colour (closed-select text + option colours) --------------- */
export function statusColor(v: string): string {
  return v === 'Positive' ? '#ff5d73' : v === 'Pending' ? '#e3b341' : '#3ddc84';
}
export function levelColor(v: string): string {
  return v === 'High' ? '#ff5d73' : v === 'Medium' ? '#e3b341' : '#3ddc84';
}
export function riskColor(v: string): string {
  return v === 'High Risk' ? '#ff5d73' : v === 'Medium Risk' ? '#e3b341' : '#3ddc84';
}
