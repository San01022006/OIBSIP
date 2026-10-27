import { Check, ChefHat, ClipboardCheck, Truck, PartyPopper, XCircle } from 'lucide-react';
import { ORDER_STATUS, TRACKING_FLOW } from '../../lib/constants.js';
import { StatusBadge } from '../ui/Feedback.jsx';

const ICONS = {
  [ORDER_STATUS.ORDER_RECEIVED]: ClipboardCheck,
  [ORDER_STATUS.IN_KITCHEN]: ChefHat,
  [ORDER_STATUS.SENT_TO_DELIVERY]: Truck,
  [ORDER_STATUS.DELIVERED]: PartyPopper,
};

export function StatusTracker({ status }) {
  if (status === ORDER_STATUS.CANCELLED) {
    return (
      <div className="alert alert--error" role="status">
        <XCircle size={18} /> This order was cancelled.
      </div>
    );
  }
  if (status === ORDER_STATUS.PAYMENT_PENDING || status === ORDER_STATUS.PAYMENT_FAILED) {
    return (
      <div className={`alert alert--${status === ORDER_STATUS.PAYMENT_FAILED ? 'error' : 'warning'}`} role="status">
        <ClipboardCheck size={18} />
        {status === ORDER_STATUS.PAYMENT_FAILED
          ? 'Payment failed — please retry payment.'
          : 'Awaiting payment confirmation.'}
      </div>
    );
  }

  const currentIndex = TRACKING_FLOW.indexOf(status);

  return (
    <div className="tracker" role="list" aria-label="Order progress">
      {TRACKING_FLOW.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const Icon = ICONS[step];
        return (
          <div
            key={step}
            role="listitem"
            className={`tracker__node ${done ? 'done' : ''} ${current ? 'current' : ''}`}
            aria-current={current ? 'step' : undefined}
          >
            <div className="tracker__dot">
              {done ? <Check size={15} /> : <Icon size={15} />}
            </div>
            <div className="tracker__label">
              {step === ORDER_STATUS.ORDER_RECEIVED && 'Order Received'}
              {step === ORDER_STATUS.IN_KITCHEN && 'In Kitchen'}
              {step === ORDER_STATUS.SENT_TO_DELIVERY && 'Sent to Delivery'}
              {step === ORDER_STATUS.DELIVERED && 'Delivered'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OrderStatusHeader({ order }) {
  return (
    <div className="row row--between row--wrap" style={{ marginBottom: 'var(--space-3)' }}>
      <div>
        <div className="eyebrow">Current status</div>
        <h3 style={{ margin: 0 }}>{order.orderNumber}</h3>
      </div>
      <StatusBadge status={order.status} />
    </div>
  );
}

export default StatusTracker;
