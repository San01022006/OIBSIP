import { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { orderService } from '../services/orderService.js';
import { OrderCard } from '../components/orders/OrderCard.jsx';
import { EmptyState, ErrorState, LoadingBlock } from '../components/ui/Feedback.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { LinkButton } from '../components/ui/Button.jsx';
import { STATUS_LABELS } from '../lib/constants.js';

const FILTERS = [
  { value: 'all', label: 'All orders' },
  { value: 'payment_pending', label: 'Awaiting payment' },
  { value: 'order_received', label: 'Order received' },
  { value: 'in_kitchen', label: 'In kitchen' },
  { value: 'sent_to_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function MyOrders() {
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useAsync(
    () => orderService.myOrders({ status, page, limit: 8 }),
    [status, page]
  );

  const orders = data?.items || [];
  const meta = data?.meta;

  return (
    <div className="page">
      <div className="container">
        <div className="row row--between row--wrap" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="section-head" style={{ marginBottom: 0 }}>
            <span className="eyebrow">Your account</span>
            <h1>My orders</h1>
          </div>
          <LinkButton to="/build">Build a pizza</LinkButton>
        </div>

        <div className="filter-bar">
          <div className="chips" role="group" aria-label="Filter orders">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`chip ${status === f.value ? 'active' : ''}`}
                aria-pressed={status === f.value}
                onClick={() => {
                  setStatus(f.value);
                  setPage(1);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <LoadingBlock label="Loading your orders…" />}
        {error && <ErrorState message={error.message} onRetry={reload} />}

        {!loading && !error && orders.length === 0 && (
          <EmptyState
            title={status === 'all' ? 'No orders yet' : `No ${STATUS_LABELS[status]?.toLowerCase() || ''} orders`}
            action={<LinkButton to="/menu">Browse the menu</LinkButton>}
          >
            When you place an order it will appear here with live status updates.
          </EmptyState>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="stack">
            {orders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}

        {meta && (
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
        )}
      </div>
    </div>
  );
}

export default MyOrders;
