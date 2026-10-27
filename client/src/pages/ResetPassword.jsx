import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { PasswordInput } from '../components/ui/Field.jsx';
import { Alert } from '../components/ui/Feedback.jsx';
import authService from '../services/authService.js';
import { useToast } from '../context/ToastContext.jsx';
import { mapFieldErrors, hasFieldErrors } from '../lib/formErrors.js';

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const token = params.get('token') || '';

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    const next = {};
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password))
      next.password = 'Include upper, lower case letters and a number.';
    if (form.password !== form.confirm) next.confirm = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('This reset link is missing its token. Request a new one.');
      return;
    }
    if (!validate()) return;
    setLoading(true);
    try {
      await authService.resetPassword({
        token,
        password: form.password,
        confirmPassword: form.confirm,
      });
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      const fieldErrors = mapFieldErrors(err.details, { confirmPassword: 'confirm' });
      if (hasFieldErrors(err) && Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        setError('Please fix the highlighted fields and try again.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="container auth-card">
        <div className="section-head" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Account help</span>
          <h1>Set a new password</h1>
          <p className="muted">Choose a strong password you have not used before.</p>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <form onSubmit={onSubmit} className="stack" noValidate>
          <PasswordInput
            label="New password"
            name="password"
            value={form.password}
            onChange={onChange}
            error={errors.password}
            required
            autoComplete="new-password"
          />
          <PasswordInput
            label="Confirm new password"
            name="confirm"
            value={form.confirm}
            onChange={onChange}
            error={errors.confirm}
            required
            autoComplete="new-password"
          />
          <Button type="submit" loading={loading} size="lg" disabled={!token}>
            Update password
          </Button>
        </form>

        <p className="muted text-center" style={{ marginTop: 'var(--space-4)' }}>
          <Link to="/forgot-password">Request a new reset link</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
