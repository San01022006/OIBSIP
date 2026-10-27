import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
let counter = 0;

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

function ToastRegion({ toasts, onClose }) {
  return (
    <div className="toast-region" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <Icon size={18} aria-hidden="true" />
            <div className="toast__body">
              {t.title && <div className="toast__title">{t.title}</div>}
              <div>{t.message}</div>
            </div>
            <button type="button" className="icon-btn" onClick={() => onClose(t.id)} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (message, type = 'info', options = {}) => {
      const id = ++counter;
      setToasts((t) => [...t, { id, message, type, title: options.title }]);
      const ttl = options.duration ?? 4500;
      if (ttl) setTimeout(() => remove(id), ttl);
      return id;
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      push,
      success: (m, o) => push(m, 'success', o),
      error: (m, o) => push(m, 'error', o),
      warning: (m, o) => push(m, 'warning', o),
      info: (m, o) => push(m, 'info', o),
      remove,
    }),
    [push, remove]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastRegion toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastContext;
