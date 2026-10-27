import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync.js';
import { useSocket, useSocketEvent } from '../../context/SocketContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import adminService from '../../services/adminService.js';
import { Button, LinkButton } from '../../components/ui/Button.jsx';
import {
  ErrorState,
  LoadingBlock,
  PaymentBadge,
  StatusBadge,
} from '../../components/ui/Feedback.jsx';
import { StatusTracker } from '../../components/orders/StatusTracker.jsx';
import { TextInput } from '../../components/ui/Field.jsx';
import { formatINR, formatDateTime } from '../../lib/format.js';
import { ALLOWED_TRANSITIONS, STATUS_LABELS } from '../../lib/constants.js';

export function AdminOrderDetails() {
  const { id } = useParams();
  const toast = useToast();
  const { socket, connected } = useSocket();
  const { data, loading, error, reload } = useAsync(() => adminService.order(id), [id]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const onOrderUpdate = useCallback(
    (payload) => {
      if (payload?.orderId === id) reload();
    },
    [id, reload]
  );
  useSocketEvent('order:updated', onOrderUpdate);

  const joinOrderRoom = useCallback(() => {
    socket?.emit('join:order', id, () => {});
  }, [socket, id]);
  useSocketEvent('connect', joinOrderRoom);

  const changeStatus = async (status) => {
    if (status === 'cancelled' && !window.confirm('Cancel this order and release/restore stock?')) return;
    setBusy(true);
    try {
      await adminService.updateOrderStatus(id, status, note);
      toast.success(`Status updated to ${STATUS_LABELS[status]}`);
      setNote('');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading order…" />;
  if (error)
    return (
      <>
        <ErrorState title="Order not found" message={error.message} onRetry={reload} />
        <LinkButton to="/admin/orders" variant="secondary">
          Back to orders
        </LinkButton>
      </>
    );

  const { order, payment, movements } = data;
  const nextStatuses = ALLOWED_TRANSITIONS[order.status] || [];

  return (
    <div className="stack">
      <Link to="/admin/orders" className="link-sm">
        <ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> All orders
      </Link>

      <div className="row row--between row--wrap">
        <div>
          <span className="eyebrow">{formatDateTime(order.createdAt)}</span>
          <h1 style={{ margin: 0 }}>{order.orderNumber}</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className={`live-dot ${connected ? 'on' : 'off'}`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? 'Live' : 'Offline'}
          </span>
          <PaymentBadge status={order.paymentStatus} />
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="admin-grid">
        <div className="stack">
          <section className="panel">
            <h2>Fulfilment</h2>
            <StatusTracker status={order.status} />

            {nextStatuses.length > 0 ? (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <TextInput
                  label="Note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  placeholder="e.g. packed and handed to rider"
                />
                <div className="row row--wrap" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  {nextStatuses.map((s) => (
                    <Button
                      key={s}
                      variant={s === 'cancelled' ? 'secondary' : 'primary'}
                      loading={busy}
                      onClick={() => changeStatus(s)}
                    >
                      Move to {STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="muted" style={{ marginTop: 'var(--space-3)' }}>
                No further transitions available.
              </p>
            )}
          </section>

          <section className="panel">
            <h2>Items</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Configuration</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td className="muted" style={{ fontSize: 'var(--text-xs)', maxWidth: 320 }}>
                        {[item.configuration.base?.name, item.configuration.sauce?.name, item.configuration.cheese?.name, ...item.configuration.vegetables.map((v) => v.name)]
                          .filter(Boolean)
                          .join(' · ')}
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatINR(item.unitPrice)}</td>
                      <td>{formatINR(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>Inventory movements</h2>
            {movements.length === 0 ? (
              <p className="muted">No movements recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Type</th>
                      <th>Ingredient</th>
                      <th>Change</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m._id}>
                        <td>{formatDateTime(m.createdAt)}</td>
                        <td>{m.type}</td>
                        <td>{m.ingredientName || '—'}</td>
                        <td className={m.change >= 0 ? 'success' : ''}>{m.change > 0 ? `+${m.change}` : m.change}</td>
                        <td className="muted">{m.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="stack">
          <section className="panel order-summary">
            <h2>Payment</h2>
            <ul className="summary-list">
              <li>
                <span>Subtotal</span>
                <span>{formatINR(order.pricing.subtotal)}</span>
              </li>
              <li>
                <span>Delivery</span>
                <span>{order.pricing.deliveryFee ? formatINR(order.pricing.deliveryFee) : 'Free'}</span>
              </li>
              <li>
                <span>Tax</span>
                <span>{formatINR(order.pricing.tax)}</span>
              </li>
            </ul>
            <div className="summary-total">
              <span>Total</span>
              <span>{formatINR(order.pricing.total)}</span>
            </div>
            {payment && (
              <ul className="summary-list" style={{ marginTop: 'var(--space-3)' }}>
                <li>
                  <span>Provider</span>
                  <span>{payment.isMock ? 'Mock (dev)' : payment.provider}</span>
                </li>
                <li>
                  <span>Payment status</span>
                  <PaymentBadge status={payment.status} />
                </li>
                {payment.razorpayPaymentId && (
                  <li>
                    <span>Payment ID</span>
                    <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {payment.razorpayPaymentId}
                    </span>
                  </li>
                )}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2>Delivery</h2>
            <div className="stack" style={{ gap: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>
              <strong>{order.delivery.name}</strong>
              <span>{order.delivery.phone}</span>
              <span className="muted">
                {order.delivery.address}, {order.delivery.city} {order.delivery.postalCode}
              </span>
              {order.delivery.instructions && <em>“{order.delivery.instructions}”</em>}
            </div>
          </section>

          <section className="panel">
            <h2>History</h2>
            <ol className="timeline">
              {[...order.statusHistory].reverse().map((h, i) => (
                <li key={i}>
                  <strong>{STATUS_LABELS[h.status] || h.status}</strong>
                  <span className="muted"> · {formatDateTime(h.at)}</span>
                  {h.note && <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{h.note}</div>}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default AdminOrderDetails;
