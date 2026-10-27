import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  ClipboardList,
  ChefHat,
  CheckCircle2,
  XCircle,
  TriangleAlert,
  RefreshCw,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync.js';
import adminService from '../../services/adminService.js';
import { Badge, ErrorState, LoadingBlock, StatusBadge } from '../../components/ui/Feedback.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { formatINR, formatDateTime } from '../../lib/format.js';

function Stat({ icon: Icon, label, value, tone = 'primary' }) {
  return (
    <div className="stat-card">
      <span className={`stat-card__icon stat-card__icon--${tone}`}>
        <Icon size={20} />
      </span>
      <div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => adminService.dashboard(), []);

  if (loading) return <LoadingBlock label="Loading dashboard…" />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  const { summary, recentOrders, lowStockItems, statusDistribution } = data;

  return (
    <div className="stack">
      <div className="row row--between row--wrap">
        <div>
          <span className="eyebrow">Overview</span>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
        </div>
        <Button variant="secondary" size="sm" onClick={reload}>
          <RefreshCw size={15} /> Refresh
        </Button>
      </div>

      <div className="grid grid--4">
        <Stat icon={ClipboardList} label="Total orders" value={summary.totalOrders} />
        <Stat icon={ChefHat} label="In preparation" value={summary.inPreparation} tone="warning" />
        <Stat icon={CheckCircle2} label="Delivered" value={summary.completed} tone="success" />
        <Stat icon={IndianRupee} label="Revenue (paid)" value={formatINR(summary.revenue)} tone="success" />
        <Stat icon={ClipboardList} label="Pending payment / new" value={summary.pendingOrders} tone="info" />
        <Stat icon={XCircle} label="Cancelled" value={summary.cancelled} tone="error" />
        <Stat icon={TriangleAlert} label="Low-stock items" value={summary.lowStockCount} tone="warning" />
      </div>

      <div className="admin-grid">
        <section className="panel">
          <div className="row row--between">
            <h2>Recent orders</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')}>
              View all
            </Button>
          </div>
          {recentOrders.length === 0 ? (
            <p className="muted">No orders yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o._id} onClick={() => navigate(`/admin/orders/${o._id}`)} style={{ cursor: 'pointer' }}>
                      <td>
                        <strong>{o.orderNumber}</strong>
                        <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                          {formatDateTime(o.createdAt)}
                        </div>
                      </td>
                      <td>{o.user?.name || '—'}</td>
                      <td>{formatINR(o.pricing.total)}</td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="stack">
          <section className="panel">
            <h2>Low stock</h2>
            {lowStockItems.length === 0 ? (
              <p className="muted">All ingredients are healthy.</p>
            ) : (
              <ul className="summary-list">
                {lowStockItems.map((i) => (
                  <li key={i._id}>
                    <span>
                      {i.name} <span className="muted">· {i.category}</span>
                    </span>
                    <Badge tone={i.stock <= 0 ? 'error' : 'warning'}>
                      {i.stock} {i.unit || 'units'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin/inventory')} style={{ marginTop: 'var(--space-3)' }}>
              Manage inventory
            </Button>
          </section>

          <section className="panel">
            <h2>Orders by status</h2>
            {statusDistribution.length === 0 ? (
              <p className="muted">No data yet.</p>
            ) : (
              <ul className="summary-list">
                {statusDistribution.map((s) => (
                  <li key={s.status}>
                    <StatusBadge status={s.status} />
                    <span>{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
