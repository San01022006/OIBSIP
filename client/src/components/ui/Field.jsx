import { useId } from 'react';

export function Field({ label, htmlFor, error, hint, required, children }) {
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label} {required && <span aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error && (
        <span className="field__error" role="alert" id={`${htmlFor}-error`}>
          {error}
        </span>
      )}
      {!error && hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export function TextInput({ label, error, hint, required, className = '', id, ...rest }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <input
        id={inputId}
        className={`input ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        required={required}
        {...rest}
      />
    </Field>
  );
}

export function PasswordInput({ label, error, hint, required, id, ...rest }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <input
        id={inputId}
        type="password"
        className="input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        required={required}
        {...rest}
      />
    </Field>
  );
}

export function Textarea({ label, error, hint, required, className = '', id, ...rest }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <textarea
        id={inputId}
        className={`textarea ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        required={required}
        {...rest}
      />
    </Field>
  );
}

export function Select({ label, error, hint, required, children, className = '', id, ...rest }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <select id={inputId} className={`select ${className}`} required={required} {...rest}>
        {children}
      </select>
    </Field>
  );
}

export default TextInput;
