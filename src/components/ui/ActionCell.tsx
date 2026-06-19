/** A single right-rail action button (icon + label, colour-tinted, hover deepens). */
import type { CSSProperties, ReactNode } from 'react';

interface ActionCellProps {
  icon: ReactNode;
  label: string;
  color: string;
  bg: string;
  bgHover: string;
  border: string;
  onClick?: () => void;
}

export function ActionCell({ icon, label, color, bg, bgHover, border, onClick }: ActionCellProps) {
  const style = {
    ['--cell-color']: color,
    ['--cell-bg']: bg,
    ['--cell-bg-hover']: bgHover,
    ['--cell-border']: border,
  } as CSSProperties;

  return (
    <button type="button" className="hk-action-cell" style={style} onClick={onClick}>
      <span aria-hidden="true" className="hk-action-cell-icon">
        {icon}
      </span>
      {label}
    </button>
  );
}
