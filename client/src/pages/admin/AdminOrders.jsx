import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import adminService from '../../services/adminService.js';
import { Pagination } from '../../components/ui/Pagination.jsx';
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  PaymentBadge,
  StatusBadge,
} from '../../components/ui/Feedback.jsx';
import { Select } from '../../components/ui/Field.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { formatINR, formatDateTime } from '../../lib/format.js';
import { ORDER_STATUS, STATUS_LABELS } from '../../lib/constants.js';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  ...Object.values(ORDER_STATUS).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'All payments' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

export function AdminOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 400);

  const { data, loading, error, reload } = useAsync(
    () => adminService.orders({ search: debounced, status, paymentStatus, page, limit: 12 }),
    [debounced, status, paymentStatus, page]
  );

  const orders = data?.items || [];
  const meta = data?.meta;

  return (
    <div className="stack">
      <div className="row row--between row--wrap">
        <div>
          <span className="eyebrow">Operations</span>
          <h1 style={{ margin: 0 }}>Orders</h1>
        </div>
      </div>

      <section className="panel">
        <div className="admin-filters">
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-ink-soft)' }} />
            <input
              className="input"
              style={{ paddingLeft: 40 }}
              placeholder="Search by order number, name or phone…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search orders"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by payment status"
          >
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={reload}>
            Refresh
          </Button>
        </div>

        {loading && <LoadingBlock label="Loading orders…" />}
        {error && <ErrorState message={error.message} onRetry={reload} />}

        {!loading && !error && orders.length === 0 && <EmptyState title="No matching orders" />}

        {!loading && !error && orders.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <strong>{o.orderNumber}</strong>
                      <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                        {formatDateTime(o.createdAt)}
                      </div>
                    </td>
                    <td>
                      {o.user?.name || o.delivery?.name || '—'}
                      <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                        {o.delivery?.phone}
                      </div>
                    </td>
                    <td>{o.items?.length || 0}</td>
                    <td>{formatINR(o.pricing.total)}</td>
                    <td>
                      <PaymentBadge status={o.paymentStatus} />
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/orders/${o._id}`)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && (
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
        )}
      </section>
    </div>
  );
}

export default AdminOrders;
