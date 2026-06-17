/**
 * Assessment workstation. Sticky top bar, page title, then a two-column grid:
 * the nine form sections stacked in the main column and the sticky right rail
 * (avatar + required diligence + actions) pinned below the top bar on scroll.
 */
import { TopBar } from '@/components/workstation/TopBar';
import { Sidebar } from '@/components/workstation/Sidebar';
import { Section01Admin } from '@/components/workstation/sections/Section01Admin';
import { Section02Entity } from '@/components/workstation/sections/Section02Entity';
import { Section03Sanctions } from '@/components/workstation/sections/Section03Sanctions';
import { Section04Adverse } from '@/components/workstation/sections/Section04Adverse';
import { Section05Identifications } from '@/components/workstation/sections/Section05Identifications';
import { Section06Pf } from '@/components/workstation/sections/Section06Pf';
import { Section07Rba } from '@/components/workstation/sections/Section07Rba';
import { Section08Signoff } from '@/components/workstation/sections/Section08Signoff';
import { Section09Versions } from '@/components/workstation/sections/Section09Versions';

export function Workstation() {
  return (
    <div className="hk-app-bg">
      <TopBar />

      <div className="hk-page hk-page-title-wrap">
        <h1 className="hk-page-title">
          Customer &amp; Counterparty <span className="hk-grad-text">Due Diligence</span>
        </h1>
      </div>

      <div className="hk-page hk-grid">
        <div className="hk-col">
          <Section01Admin />
          <Section02Entity />
          <Section03Sanctions />
          <Section04Adverse />
          <Section05Identifications />
          <Section06Pf />
          <Section07Rba />
          <Section08Signoff />
          <Section09Versions />
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
