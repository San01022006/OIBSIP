import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, MapPin, Phone, XCircle, Wifi, WifiOff, FlaskConical } from 'lucide-react';
import { useAsync } from '../hooks/useAsync.js';
import { useSocket, useSocketEvent } from '../context/SocketContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useConfig } from '../context/ConfigContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { orderService } from '../services/orderService.js';
import paymentService, { loadRazorpayScript } from '../services/paymentService.js';
import { Button, LinkButton } from '../components/ui/Button.jsx';
import { Alert, ErrorState, LoadingBlock, PaymentBadge } from '../components/ui/Feedback.jsx';
import { StatusTracker, OrderStatusHeader } from '../components/orders/StatusTracker.jsx';
import { formatINR, formatDateTime } from '../lib/format.js';
import { ORDER_STATUS } from '../lib/constants.js';

const PAYABLE = [ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.PAYMENT_FAILED];

function configSummary(cfg) {
  const veg = (cfg.vegetables || []).map((v) => v.name).join(', ');
  return [cfg.base?.name, cfg.sauce?.name, cfg.cheese?.name, veg].filter(Boolean).join(' · ');
}

export function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { clear } = useCart();
  const { payments } = useConfig();
  const { socket, connected } = useSocket();

  const { data, loading, error, reload, setData } = useAsync(() => orderService.getOrder(id), [id]);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const order = data?.order;
  const payment = data?.payment;

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

  // Join the order room once the socket is connected.
  useSocketEvent('connect', joinOrderRoom);

  const payNow = async () => {
    setPaying(true);
    try {
      const session = await paymentService.createSession(order._id);

      if (session.mock) {
        const result = await paymentService.verifyMock({ orderId: order._id, token: session.mockToken });
        toast.success('Test payment recorded (development mode).');
        if (result?.order) setData({ order: result.order, payment });
        clear();
        reload();
        return;
      }

      const ready = await loadRazorpayScript();
      if (!ready) {
        toast.error('Could not load the payment gateway. Check your connection.');
        return;
      }
      const rzp = new window.Razorpay({
        key: session.keyId,
        amount: session.amount,
        currency: session.currency,
        name: 'Crust & Craft',
        description: `Order ${session.orderNumber}`,
        order_id: session.razorpayOrderId,
        theme: { color: '#c0392b' },
        handler: async (response) => {
          try {
            await paymentService.verifyRazorpay({
              orderId: order._id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast.success('Payment successful!');
            clear();
            reload();
          } catch (err) {
            toast.error(err.message || 'Could not verify payment.');
          }
        },
        modal: {
          ondismiss: () => {
            paymentService.reportFailed(order._id, 'Checkout dismissed by customer').catch(() => {});
          },
        },
      });
      rzp.on('payment.failed', (resp) => {
        paymentService
          .reportFailed(order._id, resp?.error?.description || 'Payment failed')
          .catch(() => {});
      });
      rzp.open();
    } catch (err) {
      toast.error(err.message || 'Could not start payment.');
    } finally {
      setPaying(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel this order? Reserved ingredients will be released.')) return;
    setCancelling(true);
    try {
      await orderService.cancel(order._id, 'Cancelled by customer');
      toast.success('Order cancelled.');
      reload();
      navigate('/my-orders');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <LoadingBlock label="Loading your order…" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page">
        <div className="container">
          <ErrorState
            title="Order not found"
            message={error.message}
            onRetry={reload}
          />
          <div className="text-center" style={{ marginTop: 'var(--space-4)' }}>
            <LinkButton to="/my-orders" variant="secondary">
              Back to my orders
            </LinkButton>
          </div>
        </div>
      </div>
    );
  }

  const canPay = PAYABLE.includes(order.status);

  return (
    <div className="page">
      <div className="container">
        <Link to="/my-orders" className="link-sm" style={{ display: 'inline-block', marginBottom: 'var(--space-4)' }}>
          <ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> All orders
        </Link>

        <div className="order-detail-grid">
          <div className="stack">
            <section className="panel">
              <div className="row row--between row--wrap" style={{ marginBottom: 'var(--space-2)' }}>
                <OrderStatusHeader order={order} />
              </div>
              <div className="row" style={{ gap: 8, marginBottom: 'var(--space-5)' }}>
                <PaymentBadge status={order.paymentStatus} />
                <span className={`live-dot ${connected ? 'on' : 'off'}`}>
                  {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
                  {connected ? 'Live updates on' : 'Connecting…'}
                </span>
              </div>
              <StatusTracker status={order.status} />
            </section>

            {canPay && (
              <section className="panel">
                <h2>Complete payment</h2>
                {payments.mockEnabled ? (
                  <Alert tone="warning" title="Developer test mode">
                    Online payments are not configured, so a simulated <strong>mock</strong> payment is
                    available for this demo. No real money is charged.
                  </Alert>
                ) : (
                  <p className="muted">
                    Your ingredients are reserved for a short time. Complete payment to start cooking.
                  </p>
                )}
                <Button size="lg" loading={paying} onClick={payNow} className="btn--block" style={{ marginTop: 'var(--space-3)' }}>
                  {payments.mockEnabled ? <FlaskConical size={17} /> : <CreditCard size={17} />}
                  {order.status === ORDER_STATUS.PAYMENT_FAILED ? 'Retry payment' : 'Pay'} {formatINR(order.pricing.total)}
                </Button>
                {payment?.status === 'failed' && (
                  <p className="field__error" style={{ marginTop: 'var(--space-2)' }}>
                    Previous attempt failed: {payment.failureReason || 'Payment failed'}
                  </p>
                )}
              </section>
            )}

            <section className="panel">
              <h2>Items</h2>
              <div className="stack" style={{ gap: 'var(--space-4)' }}>
                {order.items.map((item, i) => (
                  <div key={i} className="row row--between" style={{ alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <strong>
                        {item.quantity}× {item.name}
                      </strong>
                      <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                        {configSummary(item.configuration)}
                      </div>
                    </div>
                    <span className="price">{formatINR(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <h2>Status history</h2>
              <ol className="timeline">
                {[...order.statusHistory].reverse().map((h, i) => (
                  <li key={i}>
                    <strong>{h.status.replace(/_/g, ' ')}</strong>
                    <span className="muted"> · {formatDateTime(h.at)}</span>
                    {h.note && <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{h.note}</div>}
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="stack">
            <section className="panel order-summary">
              <h2>Summary</h2>
              <ul className="summary-list">
                <li>
                  <span>Subtotal</span>
                  <span>{formatINR(order.pricing.subtotal)}</span>
                </li>
                <li>
                  <span>Delivery fee</span>
                  <span>{order.pricing.deliveryFee ? formatINR(order.pricing.deliveryFee) : 'Free'}</span>
                </li>
                <li>
                  <span>Tax ({Math.round(order.pricing.taxRate * 100)}%)</span>
                  <span>{formatINR(order.pricing.tax)}</span>
                </li>
              </ul>
              <div className="summary-total">
                <span>Total</span>
                <span>{formatINR(order.pricing.total)}</span>
              </div>
            </section>

            <section className="panel">
              <h2>Delivery</h2>
              <div className="stack" style={{ gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                <div className="row" style={{ gap: 8 }}>
                  <MapPin size={16} color="var(--color-primary)" />
                  <span>
                    <strong>{order.delivery.name}</strong>
                    <br />
                    {order.delivery.address}, {order.delivery.city} {order.delivery.postalCode}
                  </span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Phone size={16} color="var(--color-primary)" />
                  <span>{order.delivery.phone}</span>
                </div>
                {order.delivery.instructions && (
                  <p className="muted" style={{ margin: 0 }}>
                    “{order.delivery.instructions}”
                  </p>
                )}
              </div>
            </section>

            {![ORDER_STATUS.CANCELLED, ORDER_STATUS.DELIVERED].includes(order.status) && (
              <Button variant="ghost" loading={cancelling} onClick={cancel} className="btn--block">
                <XCircle size={16} /> Cancel order
              </Button>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

export default OrderDetails;
