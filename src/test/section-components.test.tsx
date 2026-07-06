/**
 * Unit tests for representative workstation form sections. Confirms each field
 * renders and edits are written back to the assessment store.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useAssessment } from '@/store/useAssessment';
import { Section01Admin } from '@/components/workstation/sections/Section01Admin';
import { Section08Signoff } from '@/components/workstation/sections/Section08Signoff';

beforeEach(() => {
  useAssessment.getState().reset();
});
afterEach(cleanup);

describe('Section01Admin', () => {
  it('renders the administration fields and writes edits to the store', () => {
    render(<Section01Admin />);
    expect(screen.getByText('01')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('REFERENCE NUMBER'), {
      target: { value: 'CDD-2026-001' },
    });
    expect(useAssessment.getState().admin.referenceNumber).toBe('CDD-2026-001');

    fireEvent.change(screen.getByLabelText('ASSESSED BY'), { target: { value: 'A. Analyst' } });
    expect(useAssessment.getState().admin.assessedBy).toBe('A. Analyst');

    fireEvent.change(screen.getByLabelText('ROLE / DEPARTMENT'), {
      target: { value: 'Compliance Officer' },
    });
    expect(useAssessment.getState().admin.role).toBe('Compliance Officer');
  });
});

describe('Section08Signoff', () => {
  it('renders the sign-off fields and writes edits to the store', () => {
    render(<Section08Signoff />);
    expect(screen.getByText('08')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('PREPARED BY'), { target: { value: 'A. Analyst' } });
    expect(useAssessment.getState().signoff.preparedBy).toBe('A. Analyst');

    fireEvent.change(screen.getByLabelText('APPROVED - ROLE'), { target: { value: 'MLRO' } });
    expect(useAssessment.getState().signoff.approvedRole).toBe('MLRO');
  });

  it('shows the records-retention note', () => {
    render(<Section08Signoff />);
    expect(screen.getByText(/records-retention policy/i)).toBeInTheDocument();
  });
});
