import { Link } from 'react-router-dom';
import { Flame, Clock, Star } from 'lucide-react';
import { ImageWithFallback } from '../common/ImageWithFallback.jsx';
import { Badge } from '../ui/Feedback.jsx';
import { Button } from '../ui/Button.jsx';
import { formatINR } from '../../lib/format.js';

export function PizzaCard({ pizza, onCustomize }) {
  const unavailable = !pizza.available;
  return (
    <article className="pizza-card">
      <Link to={`/build?pizza=${pizza._id}`} className="pizza-card__media" aria-label={`Customize ${pizza.name}`}>
        <ImageWithFallback src={pizza.image} alt={pizza.name} fallbackLabel={pizza.name} />
        <div className="pizza-card__tags">
          <Badge tone={pizza.isVeg ? 'success' : 'error'}>{pizza.isVeg ? 'Veg' : 'Non-Veg'}</Badge>
          {pizza.featured && <Badge tone="primary">Popular</Badge>}
        </div>
      </Link>
      <div className="pizza-card__body">
        <div className="row row--between" style={{ alignItems: 'flex-start' }}>
          <h3 className="pizza-card__title">{pizza.name}</h3>
          <span className="price">{formatINR(pizza.price)}</span>
        </div>
        <p className="pizza-card__desc">{pizza.description}</p>
        <div className="pizza-card__meta">
          <span className="stars">
            <Star size={13} style={{ verticalAlign: '-2px' }} /> {pizza.rating?.toFixed(1)}
          </span>
          <span>
            <Clock size={13} style={{ verticalAlign: '-2px' }} /> {pizza.prepMinutes} min
          </span>
          {pizza.spicyLevel > 0 && (
            <span style={{ color: 'var(--color-primary)' }}>
              {Array.from({ length: pizza.spicyLevel }).map((_, i) => (
                <Flame key={i} size={13} style={{ verticalAlign: '-2px' }} />
              ))}
            </span>
          )}
        </div>
        <div className="pizza-card__footer">
          <Button
            variant={unavailable ? 'secondary' : 'primary'}
            size="sm"
            disabled={unavailable}
            onClick={() => onCustomize?.(pizza)}
          >
            {unavailable ? 'Unavailable' : 'Customize'}
          </Button>
          <Link to={`/build?pizza=${pizza._id}`} className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            {pizza.ingredients?.slice(0, 2).join(' · ')}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default PizzaCard;
