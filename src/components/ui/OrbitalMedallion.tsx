/**
 * Orbital medallion: a circular robot portrait wrapped in counter-rotating ring
 * borders (+ optional dashed ring, glow, breathing, badge). Used by the lock
 * gate, top bar, sidebar avatar and report header — all ring/colour variation
 * is passed in so the same primitive serves every screen.
 */
import type { CSSProperties, ReactNode } from 'react';

export interface RingLayer {
  /** Inset from the medallion edge in px (may be negative). */
  inset: number;
  /** Border width in px (default 1). */
  width?: number;
  topColor?: string;
  rightColor?: string;
  bottomColor?: string;
  leftColor?: string;
  /** Dashed ring: uses `color` all around. */
  dashed?: boolean;
  color?: string;
  durationS: number;
  reverse?: boolean;
}

export interface OrbitalMedallionProps {
  size: number;
  image: string;
  imageInset: number;
  objectPosition?: string;
  /** Full box-shadow glow value, e.g. "0 0 42px rgba(61,220,132,.5)". */
  glow?: string;
  rings?: RingLayer[];
  breatheS?: number;
  badge?: ReactNode;
  onClick?: () => void;
  title?: string;
  ariaLabel?: string;
  className?: string;
}

function ringStyle(r: RingLayer): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    inset: r.inset,
    borderRadius: '50%',
    borderWidth: r.width ?? 1,
    borderStyle: r.dashed ? 'dashed' : 'solid',
    animation: `${r.reverse ? 'hk-spin-rev' : 'hk-spin'} ${r.durationS}s linear infinite`,
  };
  if (r.dashed) {
    base.borderColor = r.color ?? 'transparent';
  } else {
    base.borderColor = 'transparent';
    base.borderTopColor = r.topColor ?? 'transparent';
    base.borderRightColor = r.rightColor ?? 'transparent';
    base.borderBottomColor = r.bottomColor ?? 'transparent';
    base.borderLeftColor = r.leftColor ?? 'transparent';
  }
  return base;
}

export function OrbitalMedallion({
  size,
  image,
  imageInset,
  objectPosition = '50% 28%',
  glow,
  rings = [],
  breatheS,
  badge,
  onClick,
  title,
  ariaLabel,
  className,
}: OrbitalMedallionProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      className={className}
      onClick={onClick}
      title={title}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      style={{
        position: 'relative',
        width: size,
        height: size,
        flex: 'none',
        cursor: interactive ? 'pointer' : undefined,
        animation: breatheS ? `hk-breathe ${breatheS}s ease-in-out infinite` : undefined,
      }}
    >
      {rings.map((r, i) => (
        <span key={i} style={ringStyle(r)} aria-hidden />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: imageInset,
          borderRadius: '50%',
          overflow: 'hidden',
          boxShadow: glow
            ? `${glow}, inset 0 0 24px rgba(0,0,0,.6)`
            : undefined,
        }}
      >
        <img
          src={image}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition }}
        />
      </div>
      {badge && (
        <div
          style={{
            position: 'absolute',
            right: 2,
            bottom: 2,
            width: 30,
            height: 30,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#13101f',
            border: '1px solid rgba(232,90,255,.5)',
            boxShadow: '0 0 14px rgba(232,90,255,.4)',
            color: '#f7c9ff',
          }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}
