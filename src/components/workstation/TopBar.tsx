/** Sticky top bar: logo + wordmark · systems status · countdown · LOCK. */
import { useAssessment } from '@/store/useAssessment';
import { formatCountdown } from '@/lib/format';
import { OrbitalMedallion } from '@/components/ui/OrbitalMedallion';
import { Countdown, LockToggle } from '@/components/icons';

export function TopBar() {
  const remaining = useAssessment((s) => s.remaining);
  const lock = useAssessment((s) => s.lock);

  return (
    <div className="hk-topbar">
      <div className="hk-topbar-left">
        <OrbitalMedallion
          size={46}
          image="/assets/robot-android.jpg"
          imageInset={4}
          objectPosition="50% 30%"
          rings={[
            { inset: -3, width: 1.5, topColor: '#e85aff', rightColor: '#7b5bff', durationS: 5.5 },
            { inset: 1, bottomColor: '#36e0d0', durationS: 7, reverse: true },
          ]}
        />
        <div style={{ minWidth: 0 }}>
          <div className="hk-wordmark">HAWKEYE STERLING</div>
        </div>
      </div>

      <div className="hk-topbar-right">
        <div className="hk-systems">
          <span className="hk-live-dot" aria-hidden />
          <span className="hk-systems-label">ALL SYSTEMS LIVE</span>
        </div>
        <span
          className="hk-countdown-pill"
          role="timer"
          aria-label={`Session time remaining: ${formatCountdown(remaining)}`}
        >
          <Countdown size={13} strokeWidth={2} aria-hidden="true" />
          {formatCountdown(remaining)}
        </span>
        <button type="button" className="hk-lock-btn" onClick={lock}>
          <LockToggle size={13} strokeWidth={2} />
          LOCK
        </button>
      </div>
    </div>
  );
}
