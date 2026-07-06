/**
 * Unit tests for the reusable UI primitives: Modal (accessibility, close
 * affordances, focus trap) and Toaster (store-driven live region).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Modal } from '@/components/ui/Modal';
import { Toaster } from '@/components/ui/Toast';
import { useToast } from '@/store/useToast';

afterEach(cleanup);

describe('Modal', () => {
  it('renders an accessible dialog with the title, body and focused close button', () => {
    render(
      <Modal title="Register" onClose={() => {}}>
        <p>Body content</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByLabelText('Close')).toHaveFocus();
  });

  it('closes via the close button, the backdrop, and the Escape key', () => {
    const onClose = vi.fn();
    render(
      <Modal title="T" onClose={onClose}>
        <p>x</p>
      </Modal>,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('presentation')); // backdrop overlay
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('does not close when the dialog surface itself is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal title="T" onClose={onClose}>
        <p>inside</p>
      </Modal>,
    );
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('traps Tab focus: wraps backward from first and forward from last', () => {
    render(
      <Modal title="T" onClose={() => {}}>
        <button>Only</button>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    const close = screen.getByLabelText('Close');
    const only = screen.getByText('Only');

    close.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(only).toHaveFocus();

    only.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(close).toHaveFocus();
  });

  it('ignores non-Tab keys in the focus trap', () => {
    render(
      <Modal title="T" onClose={() => {}}>
        <button>Only</button>
      </Modal>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'a' });
    expect(screen.getByText('Only')).toBeInTheDocument(); // no throw
  });
});

describe('Toaster', () => {
  beforeEach(() => {
    useToast.setState({ message: null });
  });

  it('renders nothing when there is no message', () => {
    const { container } = render(<Toaster />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the current message in a polite status live region', () => {
    useToast.setState({ message: 'Assessment saved' });
    render(<Toaster />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Assessment saved');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});
