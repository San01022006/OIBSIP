import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, ShoppingBag, AlertTriangle, Info } from 'lucide-react';
import menuService from '../services/menuService.js';
import orderService from '../services/orderService.js';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../context/ToastContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useConfig, estimatePizzaPrice } from '../context/ConfigContext.jsx';
import { Button, LinkButton } from '../components/ui/Button.jsx';
import { Badge, ErrorState, LoadingBlock } from '../components/ui/Feedback.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { formatINR } from '../lib/format.js';
import { CATEGORY_LABELS } from '../lib/constants.js';

const STEPS = [
  { key: 'base', label: 'Base' },
  { key: 'sauce', label: 'Sauce' },
  { key: 'cheese', label: 'Cheese' },
  { key: 'vegetables', label: 'Vegetables' },
];

const isOrderable = (i) => i.available && i.stock > 0;

export function BuildPizza() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { addItem } = useCart();
  const { pricing } = useConfig();

  const pizzaId = params.get('pizza');
  const stepIndex = Math.min(3, Math.max(0, Number(params.get('step') || 0)));

  const ingredientsState = useAsync(() => menuService.listIngredients(), []);
  const ingredients = useMemo(() => ingredientsState.data || [], [ingredientsState.data]);

  const [config, setConfig] = useState({ base: null, sauce: null, cheese: null, vegetables: [] });
  const [quantity, setQuantity] = useState(1);
  const [review, setReview] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const byId = useMemo(() => new Map(ingredients.map((i) => [i._id, i])), [ingredients]);
  const byCategory = (cat) => ingredients.filter((i) => i.category === cat);

  useEffect(() => {
    if (!pizzaId || prefilled || ingredients.length === 0) return;
    let active = true;
    menuService
      .getPizza(pizzaId)
      .then((pizza) => {
        if (!active || !pizza?.recipe) return;
        const pick = (id) => (id && byId.get(id) ? byId.get(id) : null);
        const firstOf = (cat) => byCategory(cat).find(isOrderable) || null;
        const veg = (pizza.recipe.vegetables || [])
          .map(pick)
          .filter((v) => v && isOrderable(v));
        setConfig({
          base: pick(pizza.recipe.base) || firstOf('base'),
          sauce: pick(pizza.recipe.sauce) || firstOf('sauce'),
          cheese: pick(pizza.recipe.cheese) || firstOf('cheese'),
          vegetables: veg,
        });
        setPrefilled(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pizzaId, ingredients.length, prefilled]);

  const setStep = (next) => {
    const p = new URLSearchParams(params);
    p.set('step', String(next));
    setParams(p, { replace: false });
  };

  const selectSingle = (cat, ingredient) => setConfig((c) => ({ ...c, [cat]: ingredient }));
  const toggleVeg = (ingredient) =>
    setConfig((c) => {
      const exists = c.vegetables.some((v) => v._id === ingredient._id);
      return {
        ...c,
        vegetables: exists
          ? c.vegetables.filter((v) => v._id !== ingredient._id)
          : [...c.vegetables, ingredient],
      };
    });

  const estimate = estimatePizzaPrice(config, pricing.basePrice);
  const canContinue = useMemo(() => {
    if (stepIndex === 0) return Boolean(config.base);
    if (stepIndex === 1) return Boolean(config.sauce);
    if (stepIndex === 2) return Boolean(config.cheese);
    return true;
  }, [stepIndex, config]);

  const cartConfiguration = useMemo(
    () => ({
      base: config.base && { ingredient: config.base._id, name: config.base.name, price: config.base.priceAdjustment },
      sauce: config.sauce && { ingredient: config.sauce._id, name: config.sauce.name, price: config.sauce.priceAdjustment },
      cheese: config.cheese && { ingredient: config.cheese._id, name: config.cheese.name, price: config.cheese.priceAdjustment },
      vegetables: config.vegetables.map((v) => ({ ingredient: v._id, name: v.name, price: v.priceAdjustment })),
    }),
    [config]
  );

  const onReview = async () => {
    if (!config.base || !config.sauce || !config.cheese) {
      toast.error('Please choose a base, sauce and cheese before reviewing.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await orderService.preview([{ quantity, configuration: cartConfiguration }]);
      if (!result.availability?.ok) {
        const msg = result.availability.problems.map((p) => p.message).join(' ');
        toast.error(msg || 'Some ingredients are unavailable.');
        return;
      }
      setReview(result);
      setReviewOpen(true);
    } catch (err) {
      toast.error(err.message || 'Could not price your pizza.');
    } finally {
      setSubmitting(false);
    }
  };

  const addToOrder = () => {
    addItem({
      pizzaId: pizzaId || null,
      name: config.base ? `Custom Pizza` : 'Custom Pizza',
      quantity,
      configuration: cartConfiguration,
    });
    toast.success('Added to your order.');
    setReviewOpen(false);
    navigate('/checkout');
  };

  if (ingredientsState.loading) {
    return (
      <div className="page">
        <div className="container">
          <LoadingBlock label="Loading ingredients…" />
        </div>
      </div>
    );
  }
  if (ingredientsState.error) {
    return (
      <div className="page">
        <div className="container">
          <ErrorState message={ingredientsState.error.message} onRetry={ingredientsState.reload} />
        </div>
      </div>
    );
  }

  const renderOptions = () => {
    if (stepIndex < 3) {
      const cat = STEPS[stepIndex].key;
      const options = byCategory(cat);
      const selected = config[cat];
      return (
        <div className="option-grid" role="radiogroup" aria-label={`Choose a ${cat}`}>
          {options.map((opt) => {
            const orderable = isOrderable(opt);
            const isSelected = selected?._id === opt._id;
            return (
              <button
                key={opt._id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={!orderable}
                className={`option ${isSelected ? 'selected' : ''}`}
                onClick={() => orderable && selectSingle(cat, opt)}
              >
                <span className="option__check">{isSelected && <Check size={12} />}</span>
                <span className="option__body">
                  <span className="option__name">
                    {opt.name}
                    {!orderable && <Badge tone="error">Out of stock</Badge>}
                    {orderable && opt.stock <= opt.lowStockThreshold && <Badge tone="warning">Low stock</Badge>}
                  </span>
                  <span className="option__desc">{opt.description}</span>
                </span>
                <span className="option__price">
                  {opt.priceAdjustment > 0 ? `+${formatINR(opt.priceAdjustment)}` : 'Included'}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    const options = byCategory('vegetable');
    return (
      <div className="option-grid" role="group" aria-label="Choose vegetables">
        {options.map((opt) => {
          const orderable = isOrderable(opt);
          const isSelected = config.vegetables.some((v) => v._id === opt._id);
          return (
            <button
              key={opt._id}
              type="button"
              aria-pressed={isSelected}
              disabled={!orderable}
              className={`option ${isSelected ? 'selected' : ''}`}
              onClick={() => orderable && toggleVeg(opt)}
            >
              <span className="option__check">{isSelected && <Check size={12} />}</span>
              <span className="option__body">
                <span className="option__name">
                  {opt.name}
                  {!orderable && <Badge tone="error">Out of stock</Badge>}
                </span>
                <span className="option__desc">{opt.description}</span>
              </span>
              <span className="option__price">
                {opt.priceAdjustment > 0 ? `+${formatINR(opt.priceAdjustment)}` : 'Included'}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Build your pizza</span>
          <h1>Design your perfect pizza</h1>
          <p className="muted">
            Choose a base, sauce, cheese and as many fresh vegetables as you like. Prices are
            confirmed by the kitchen when you order.
          </p>
        </div>

        <div className="builder-steps">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`builder-step ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'done' : ''}`}
            >
              <span className="builder-step__num">{i < stepIndex ? <Check size={13} /> : i + 1}</span>
              {s.label}
            </div>
          ))}
        </div>

        <div className="builder">
          <div className="panel">
            <h2 style={{ textTransform: 'capitalize' }}>
              Step {stepIndex + 1}: {STEPS[stepIndex].key === 'vegetables' ? 'Vegetables' : CATEGORY_LABELS[STEPS[stepIndex].key]}
            </h2>
            {stepIndex === 3 && (
              <p className="muted">
                Select as many vegetables as you like — tap again to remove.
              </p>
            )}
            {renderOptions()}

            <div className="row row--between row--wrap" style={{ marginTop: 'var(--space-5)' }}>
              <Button
                variant="secondary"
                onClick={() => setStep(Math.max(0, stepIndex - 1))}
                disabled={stepIndex === 0}
              >
                <ChevronLeft size={16} /> Back
              </Button>
              {stepIndex < 3 ? (
                <Button onClick={() => setStep(stepIndex + 1)} disabled={!canContinue}>
                  Continue <ChevronRight size={16} />
                </Button>
              ) : (
                <Button onClick={onReview} loading={submitting}>
                  Review &amp; add to order
                </Button>
              )}
            </div>
          </div>

          <aside className="panel builder-summary" aria-label="Your pizza summary">
            <h3>Your pizza</h3>
            <ul className="summary-list">
              <li>
                <span>Base</span>
                <span>{config.base?.name || '—'}</span>
              </li>
              <li>
                <span>Sauce</span>
                <span>{config.sauce?.name || '—'}</span>
              </li>
              <li>
                <span>Cheese</span>
                <span>{config.cheese?.name || '—'}</span>
              </li>
              <li>
                <span>Vegetables</span>
                <span>
                  {config.vegetables.length ? config.vegetables.map((v) => v.name).join(', ') : '—'}
                </span>
              </li>
            </ul>

            <div className="summary-total">
              <span>Estimate / pizza</span>
              <span>{formatINR(estimate)}</span>
            </div>

            <div className="row row--between" style={{ marginTop: 'var(--space-4)' }}>
              <span style={{ fontWeight: 600 }}>Quantity</span>
              <div className="qty-control">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Decrease quantity">
                  −
                </button>
                <span aria-live="polite">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => Math.min(20, q + 1))} disabled={quantity >= 20} aria-label="Increase quantity">
                  +
                </button>
              </div>
            </div>

            <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-3)' }}>
              <Info size={13} style={{ verticalAlign: '-2px' }} /> Estimate includes the base price and
              ingredient add-ons. Taxes and delivery are calculated at checkout.
            </p>
          </aside>
        </div>
      </div>

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Confirm your pizza"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewOpen(false)}>
              Keep editing
            </Button>
            <Button onClick={addToOrder}>
              <ShoppingBag size={16} /> Add to order
            </Button>
          </>
        }
      >
        {review && (
          <>
            <div className="alert alert--success" role="status">
              <Check size={18} /> All ingredients are available and priced by the kitchen.
            </div>
            <ul className="summary-list" style={{ marginTop: 'var(--space-4)' }}>
              <li>
                <span>Base — {review.items[0].configuration.base.name}</span>
                <span>{review.items[0].configuration.base.price ? `+${formatINR(review.items[0].configuration.base.price)}` : 'Included'}</span>
              </li>
              <li>
                <span>Sauce — {review.items[0].configuration.sauce.name}</span>
                <span>{review.items[0].configuration.sauce.price ? `+${formatINR(review.items[0].configuration.sauce.price)}` : 'Included'}</span>
              </li>
              <li>
                <span>Cheese — {review.items[0].configuration.cheese.name}</span>
                <span>{review.items[0].configuration.cheese.price ? `+${formatINR(review.items[0].configuration.cheese.price)}` : 'Included'}</span>
              </li>
              {review.items[0].configuration.vegetables.map((v) => (
                <li key={v.ingredient}>
                  <span>Vegetable — {v.name}</span>
                  <span>{v.price ? `+${formatINR(v.price)}` : 'Included'}</span>
                </li>
              ))}
            </ul>
            <div className="summary-total">
              <span>Unit price × {quantity}</span>
              <span>{formatINR(review.items[0].lineTotal)}</span>
            </div>
            {!config.base && (
              <div className="alert alert--warning" style={{ marginTop: 'var(--space-3)' }}>
                <AlertTriangle size={16} /> Please complete your selection.
              </div>
            )}
          </>
        )}
      </Modal>

      <div className="container" style={{ marginTop: 'var(--space-6)' }}>
        <LinkButton to="/menu" variant="ghost" size="sm">
          <ChevronLeft size={15} /> Back to menu
        </LinkButton>
      </div>
    </div>
  );
}

export default BuildPizza;
