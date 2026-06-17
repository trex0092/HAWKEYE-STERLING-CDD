/** The shared section header: magenta 2-digit index + title + gradient hairline. */
import type { ReactNode } from 'react';

interface SectionHeaderProps {
  index: string;
  title: string;
  /** Sections 03+ use the shorter hairline gradient. */
  shortHairline?: boolean;
  /** Optional trailing control (e.g. "+ Add person"). */
  action?: ReactNode;
}

export function SectionHeader({ index, title, shortHairline, action }: SectionHeaderProps) {
  return (
    <div className="hk-section-head">
      <span className="hk-section-index">{index}</span>
      <span className="hk-section-title">{title}</span>
      <div className={`hk-hairline${shortHairline ? ' hk-hairline--short' : ''}`} />
      {action}
    </div>
  );
}
