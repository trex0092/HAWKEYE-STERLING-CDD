/**
 * Reference AML/CFT typologies for the secure vector store (VDB). Configurable firm
 * content — a starter set of common money-laundering / financing typologies used to
 * suggest likely themes from free-text adverse-media. Not authoritative; each firm
 * should align this with its own risk methodology and current FATF/regulator guidance.
 */
export interface Typology {
  id: string;
  label: string;
  /** Keyword-rich description the local embedder indexes (no PII). */
  text: string;
}

export const TYPOLOGIES: readonly Typology[] = [
  {
    id: 'trade-based',
    label: 'Trade-based money laundering',
    text: 'over invoicing under invoicing trade mispricing phantom shipments false customs declarations dual-use goods value transfer',
  },
  {
    id: 'shell-company',
    label: 'Shell / front company',
    text: 'shell company front company nominee director nominee shareholder opaque ownership no economic activity letterbox entity',
  },
  {
    id: 'structuring',
    label: 'Structuring / smurfing',
    text: 'structuring smurfing cash deposits below reporting threshold multiple small transactions layering rapid movement',
  },
  {
    id: 'sanctions-evasion',
    label: 'Sanctions evasion',
    text: 'sanctions evasion designated person front intermediary ship-to-ship transfer disabled AIS dual-use export controls circumvention',
  },
  {
    id: 'pep-corruption',
    label: 'PEP / corruption / bribery',
    text: 'politically exposed person bribery corruption embezzlement kickback state contract misappropriation public funds',
  },
  {
    id: 'terrorist-financing',
    label: 'Terrorist / proliferation financing',
    text: 'terrorist financing proliferation financing weapons procurement charity misuse hawala value transfer foreign fighter',
  },
  {
    id: 'crypto-laundering',
    label: 'Virtual-asset laundering',
    text: 'cryptocurrency virtual asset mixer tumbler chain hopping unhosted wallet exchange off-ramp privacy coin',
  },
  {
    id: 'fraud-proceeds',
    label: 'Fraud proceeds',
    text: 'fraud scam proceeds investment fraud invoice fraud business email compromise mule account stolen funds',
  },
];
