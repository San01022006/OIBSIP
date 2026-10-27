import { useEffect, useState } from 'react';
import { Search, Pencil, BellRing, RefreshCw } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import adminService from '../../services/adminService.js';
import { Badge, EmptyState, ErrorState, LoadingBlock } from '../../components/ui/Feedback.jsx';
import { Select, TextInput } from '../../components/ui/Field.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { CATEGORY_LABELS } from '../../lib/constants.js';
import { formatINR, timeAgo } from '../../lib/format.js';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];

const STOCK_OPTIONS = [
  { value: 'all', label: 'All stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
  { value: 'healthy', label: 'Healthy' },
];

function stockTone(item) {
  if (item.stock <= 0) return 'error';
  if (item.stock <= item.lowStockThreshold) return 'warning';
  return 'success';
}

function stockLabel(item) {
  if (item.stock <= 0) return 'Out of stock';
  if (item.stock <= item.lowStockThreshold) return 'Low';
  return 'Healthy';
}

function EditIngredientModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    stock: item.stock,
    lowStockThreshold: item.lowStockThreshold,
    priceAdjustment: item.priceAdjustment,
    available: item.available,
    reason: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      stock: item.stock,
      lowStockThreshold: item.lowStockThreshold,
      priceAdjustment: item.priceAdjustment,
      available: item.available,
      reason: '',
    });
  }, [item]);

  const save = async () => {
    setSaving(true);
    try {
      await adminService.updateInventory(item._id, {
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold),
        priceAdjustment: Number(form.priceAdjustment),
        available: form.available,
        reason: form.reason || 'Updated by admin',
      });
      toast.success(`${item.name} updated`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${item.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="row row--between">
          <span className="muted">Category</span>
          <Badge tone="neutral">{CATEGORY_LABELS[item.category]}</Badge>
        </div>
        <TextInput
          label="Stock on hand"
          type="number"
          min="0"
          value={form.stock}
          onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
        />
        <TextInput
          label="Low-stock threshold"
          type="number"
          min="0"
          value={form.lowStockThreshold}
          onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
        />
        <TextInput
          label="Price adjustment (₹)"
          type="number"
          min="0"
          step="1"
          value={form.priceAdjustment}
          onChange={(e) => setForm((f) => ({ ...f, priceAdjustment: e.target.value }))}
          hint="Amount added to the base price when a customer selects this ingredient"
        />
        <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.available}
            onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
          />
          Available to order
        </label>
        <TextInput
          label="Reason (audit note)"
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          placeholder="e.g. weekly restock"
          maxLength={300}
        />
      </div>
    </Modal>
  );
}

export function AdminInventory() {
  const toast = useToast();
  const [category, setCategory] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [checking, setChecking] = useState(false);
  const debounced = useDebounce(search, 400);

  const { data, loading, error, reload } = useAsync(
    () => adminService.inventory({ category, stockStatus, search: debounced, page, limit: 25 }),
    [category, stockStatus, debounced, page]
  );

  const { data: movementsData, reload: reloadMovements } = useAsync(
    () => adminService.movements({ limit: 10 }),
    []
  );

  const items = data?.items || [];
  const meta = data?.meta;
  const movements = movementsData?.items || [];

  const runAlertCheck = async () => {
    setChecking(true);
    try {
      const result = await adminService.checkAlerts();
      toast.success(`Alert check complete. ${result.notified ?? 0} notification(s) sent.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setChecking(false);
    }
  };

  const onSaved = () => {
    reload();
    reloadMovements();
  };

  return (
    <div className="stack">
      <div className="row row--between row--wrap">
        <div>
          <span className="eyebrow">Operations</span>
          <h1 style={{ margin: 0 }}>Inventory</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="secondary" onClick={reload}>
            <RefreshCw size={15} /> Refresh
          </Button>
          <Button onClick={runAlertCheck} loading={checking}>
            <BellRing size={15} /> Run low-stock alert
          </Button>
        </div>
      </div>

      <section className="panel">
        <div className="admin-filters">
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-ink-soft)' }} />
            <input
              className="input"
              style={{ paddingLeft: 40 }}
              placeholder="Search ingredients…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search ingredients"
            />
          </div>
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by category"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by stock status"
          >
            {STOCK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        {loading && <LoadingBlock label="Loading inventory…" />}
        {error && <ErrorState message={error.message} onRetry={reload} />}
        {!loading && !error && items.length === 0 && <EmptyState title="No ingredients match your filters" />}

        {!loading && !error && items.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>+Price</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.name}</strong>
                      <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                        {item.sku}
                      </div>
                    </td>
                    <td>{CATEGORY_LABELS[item.category]}</td>
                    <td>
                      {item.stock} {item.unit}
                    </td>
                    <td>{item.lowStockThreshold}</td>
                    <td>
                      <Badge tone={stockTone(item)}>{stockLabel(item)}</Badge>
                      {!item.available && <Badge tone="neutral">Disabled</Badge>}
                    </td>
                    <td>{item.priceAdjustment ? formatINR(item.priceAdjustment) : '—'}</td>
                    <td className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {timeAgo(item.lastUpdatedAt)}
                    </td>
                    <td>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(item)}>
                        <Pencil size={14} /> Edit
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

      <section className="panel">
        <h2>Recent inventory movements</h2>
        {movements.length === 0 ? (
          <p className="muted">No movements recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Ingredient</th>
                  <th>Type</th>
                  <th>Change</th>
                  <th>Balance</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m._id}>
                    <td className="muted">{timeAgo(m.createdAt)}</td>
                    <td>{m.ingredientName}</td>
                    <td>{m.type}</td>
                    <td className={m.change >= 0 ? 'success' : ''}>{m.change > 0 ? `+${m.change}` : m.change}</td>
                    <td>{m.balanceAfter}</td>
                    <td className="muted">{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && <EditIngredientModal item={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </div>
  );
}

export default AdminInventory;
