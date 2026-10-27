import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, totalPages, total, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft size={16} /> Prev
      </button>
      <span className="pagination__info">
        Page {page} of {totalPages}
        {typeof total === 'number' ? ` · ${total} total` : ''}
      </span>
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next <ChevronRight size={16} />
      </button>
    </nav>
  );
}

export default Pagination;
