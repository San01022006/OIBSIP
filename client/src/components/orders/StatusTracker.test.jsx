import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusTracker } from './StatusTracker.jsx';

describe('StatusTracker', () => {
  it('shows every tracking step for an active order', () => {
    render(<StatusTracker status="in_kitchen" />);
    expect(screen.getByText('Order Received')).toBeInTheDocument();
    expect(screen.getByText('In Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Sent to Delivery')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('marks the current step with aria-current', () => {
    render(<StatusTracker status="in_kitchen" />);
    const current = screen
      .getAllByRole('listitem')
      .find((el) => el.getAttribute('aria-current') === 'step');
    expect(current).toHaveTextContent('In Kitchen');
  });

  it('renders a cancelled notice instead of the flow', () => {
    render(<StatusTracker status="cancelled" />);
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
    expect(screen.queryByText('In Kitchen')).not.toBeInTheDocument();
  });
});
