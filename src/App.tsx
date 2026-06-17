import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAssessment } from '@/store/useAssessment';
import { Workstation } from '@/pages/Workstation';
import { Report } from '@/pages/Report';
import { LockGate } from '@/components/workstation/LockGate';
import { ModalRoot } from '@/components/workstation/modals/ModalRoot';
import { Toaster } from '@/components/ui/Toast';

export default function App() {
  const locked = useAssessment((s) => s.locked);
  const tick = useAssessment((s) => s.tick);

  // Single 1s session clock: decrements the countdown and auto-locks at zero.
  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Workstation />} />
        <Route path="/report" element={<Report />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ModalRoot />
      {locked && <LockGate />}
      <Toaster />
    </>
  );
}
