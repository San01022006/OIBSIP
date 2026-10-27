import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAsync } from '../hooks/useAsync.js';
import { useDebounce } from '../hooks/useDebounce.js';
import menuService from '../services/menuService.js';
import { PizzaCard } from '../components/pizza/PizzaCard.jsx';
import { CardSkeletonGrid, EmptyState, ErrorState } from '../components/ui/Feedback.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { PIZZA_CATEGORY_OPTIONS } from '../lib/constants.js';

const LIMIT = 9;

export function Menu() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 400);

  const { data, loading, error, reload } = useAsync(
    () => menuService.listPizzas({ search: debounced, category, page, limit: LIMIT }),
    [debounced, category, page]
  );

  const items = data?.items || [];
  const meta = data?.meta;

  return (
    <div className="page">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Our menu</span>
          <h1>Freshly made, ready to customize</h1>
          <p className="muted">
            Every pizza below can be tailored to your taste. Search by name or filter by category.
          </p>
        </div>

        <div className="filter-bar">
          <div className="filter-bar__search">
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-ink-soft)' }}
                aria-hidden="true"
              />
              <input
                className="input"
                style={{ paddingLeft: 40 }}
                placeholder="Search pizzas…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search pizzas by name"
              />
            </div>
          </div>
          <div className="chips" role="group" aria-label="Filter by category">
            {PIZZA_CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`chip ${category === opt.value ? 'active' : ''}`}
                aria-pressed={category === opt.value}
                onClick={() => {
                  setCategory(opt.value);
                  setPage(1);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <CardSkeletonGrid count={LIMIT} />}

        {error && <ErrorState message={error.message} onRetry={reload} />}

        {!loading && !error && items.length === 0 && (
          <EmptyState title="No pizzas found">
            Try a different search term or category.
          </EmptyState>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <div className="grid grid--3">
              {items.map((pizza) => (
                <PizzaCard
                  key={pizza._id}
                  pizza={pizza}
                  onCustomize={(p) => navigate(`/build?pizza=${p._id}`)}
                />
              ))}
            </div>
            <Pagination page={meta?.page || 1} totalPages={meta?.totalPages} total={meta?.total} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

export default Menu;
