import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import { Register } from './Register.jsx';
import authService from '../services/authService.js';

vi.mock('../services/authService.js', () => ({
  default: {
    me: vi.fn(),
    register: vi.fn(),
  },
}));

function renderRegister() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <Register />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

async function fillForm(user) {
  await user.type(screen.getByLabelText(/full name/i), 'Asha Rao');
  await user.type(screen.getByLabelText(/email address/i), 'asha@example.com');
  await user.type(screen.getByLabelText(/phone number/i), '9876543210');
  await user.type(screen.getByLabelText(/^password/i), 'Str0ngPass1');
  await user.type(screen.getByLabelText(/confirm password/i), 'Str0ngPass1');
}

beforeEach(() => {
  vi.clearAllMocks();
  authService.me.mockResolvedValue(null);
});

describe('Register form', () => {
  it('sends confirmPassword and phone in the payload the backend expects', async () => {
    authService.register.mockResolvedValue({ user: { id: '1' }, message: 'ok' });
    const user = userEvent.setup();
    renderRegister();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(authService.register).toHaveBeenCalledTimes(1));
    expect(authService.register).toHaveBeenCalledWith({
      name: 'Asha Rao',
      email: 'asha@example.com',
      phone: '9876543210',
      password: 'Str0ngPass1',
      confirmPassword: 'Str0ngPass1',
    });
  });

  it('surfaces field-specific server validation errors instead of only "Validation failed"', async () => {
    const err = new Error('Validation failed');
    err.status = 400;
    err.details = [{ field: 'confirmPassword', message: 'Passwords do not match' }];
    authService.register.mockRejectedValue(err);

    const user = userEvent.setup();
    renderRegister();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(
      screen.getByText(/please fix the highlighted fields and try again/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('blocks submission locally when passwords do not match', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/full name/i), 'Asha Rao');
    await user.type(screen.getByLabelText(/email address/i), 'asha@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '9876543210');
    await user.type(screen.getByLabelText(/^password/i), 'Str0ngPass1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Mismatch1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('warns instead of claiming success when email delivery fails', async () => {
    authService.register.mockResolvedValue({
      user: { id: '1' },
      emailDelivered: false,
      message: 'could not send',
    });
    const user = userEvent.setup();
    renderRegister();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(
      await screen.findByText(/verification email could not be sent/i)
    ).toBeInTheDocument();
  });
});
