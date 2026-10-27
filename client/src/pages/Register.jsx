import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { TextInput, PasswordInput } from '../components/ui/Field.jsx';
import { Alert } from '../components/ui/Feedback.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { mapFieldErrors, hasFieldErrors } from '../lib/formErrors.js';

const initial = { name: '', email: '', phone: '', password: '', confirm: '' };

export function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim() || form.name.trim().length < 2) next.name = 'Enter your full name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (!/^[0-9]{10}$/.test(form.phone.replace(/\D/g, ''))) next.phone = 'Enter a 10-digit phone number.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password))
      next.password = 'Include upper, lower case letters and a number.';
    if (form.password !== form.confirm) next.confirm = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setErrors({});
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.replace(/\D/g, ''),
        password: form.password,
        confirmPassword: form.confirm,
      });
      if (data?.emailDelivered === false) {
        toast.warning(
          'Account created, but the verification email could not be sent. Use "Resend verification".'
        );
      } else {
        toast.success('Account created! Please verify your email.');
      }
      navigate('/verify-email', { state: { email: form.email.trim() }, replace: true });
    } catch (err) {
      const fieldErrors = mapFieldErrors(err.details, { confirmPassword: 'confirm' });
      if (hasFieldErrors(err) && Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        setServerError('Please fix the highlighted fields and try again.');
      } else if (err.status === 409) {
        setErrors({ email: err.message });
        setServerError(err.message);
      } else {
        setServerError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="container auth-card">
        <div className="section-head" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Join us</span>
          <h1>Create your account</h1>
          <p className="muted">Save your favourite builds and follow every order live.</p>
        </div>

        {serverError && <Alert tone="error">{serverError}</Alert>}

        <form onSubmit={onSubmit} className="stack" noValidate>
          <TextInput
            label="Full name"
            name="name"
            value={form.name}
            onChange={onChange}
            error={errors.name}
            required
            autoComplete="name"
          />
          <TextInput
            label="Email address"
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            error={errors.email}
            required
            autoComplete="email"
          />
          <TextInput
            label="Phone number"
            name="phone"
            inputMode="numeric"
            value={form.phone}
            onChange={onChange}
            error={errors.phone}
            hint="10-digit mobile number"
            required
            autoComplete="tel"
          />
          <PasswordInput
            label="Password"
            name="password"
            value={form.password}
            onChange={onChange}
            error={errors.password}
            hint="At least 8 characters, with upper and lower case and a number"
            required
            autoComplete="new-password"
          />
          <PasswordInput
            label="Confirm password"
            name="confirm"
            value={form.confirm}
            onChange={onChange}
            error={errors.confirm}
            required
            autoComplete="new-password"
          />
          <Button type="submit" loading={loading} size="lg">
            Create Account
          </Button>
        </form>

        <p className="muted text-center" style={{ marginTop: 'var(--space-4)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
