import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { StatusBadge, PaymentBadge } from '../ui/Feedback.jsx';
import { formatINR, formatDateTime } from '../../lib/format.js';

function summarize(item) {
  const c = item.configuration;
  const veg = (c.vegetables || []).map((v) => v.name).join(', ');
  return [c.base?.name, c.sauce?.name, c.cheese?.name, veg].filter(Boolean).join(' · ');
}

export function OrderCard({ order }) {
  return (
    <article className="card">
      <div className="row row--between row--wrap" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="eyebrow">{formatDateTime(order.createdAt)}</div>
          <h3 style={{ margin: 0 }}>{order.orderNumber}</h3>
        </div>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <PaymentBadge status={order.paymentStatus} />
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="stack" style={{ marginTop: 'var(--space-4)', gap: 'var(--space-2)' }}>
        {order.items.map((item, i) => (
          <div key={i} className="row row--between" style={{ alignItems: 'flex-start', gap: 12 }}>
            <div>
              <strong style={{ fontSize: 'var(--text-sm)' }}>
                {item.quantity}× {item.name}
              </strong>
              <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                {summarize(item)}
              </div>
            </div>
            <span className="price">{formatINR(item.lineTotal)}</span>
          </div>
        ))}
      </div>

      <div className="row row--between" style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
        <span style={{ fontWeight: 700 }}>{formatINR(order.pricing.total)}</span>
        <Link to={`/my-orders/${order._id}`} className="btn btn--secondary btn--sm">
          View details <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}

export default OrderCard;
