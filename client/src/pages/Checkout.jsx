import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ShieldCheck, Info } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfig, estimatePizzaPrice } from '../context/ConfigContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { orderService } from '../services/orderService.js';
import { Button, LinkButton } from '../components/ui/Button.jsx';
import { TextInput, Textarea } from '../components/ui/Field.jsx';
import { Alert, EmptyState, Skeleton } from '../components/ui/Feedback.jsx';
import { formatINR } from '../lib/format.js';

function configSummary(cfg) {
  const veg = (cfg.vegetables || []).map((v) => v.name).join(', ');
  return [cfg.base?.name, cfg.sauce?.name, cfg.cheese?.name, veg].filter(Boolean).join(' · ');
}

export function Checkout() {
  const { items, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();
  const { pricing: pricingCfg } = useConfig();
  const toast = useToast();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    postalCode: '',
    instructions: '',
  });
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      setPreview(null);
      return;
    }
    let active = true;
    setLoadingPreview(true);
    setPreviewError('');
    orderService
      .preview(items)
      .then((res) => active && setPreview(res))
      .catch((err) => active && setPreviewError(err.message))
      .finally(() => active && setLoadingPreview(false));
    return () => {
      active = false;
    };
  }, [items]);

  const localLines = useMemo(
    () =>
      items.map((item) => {
        const unit = estimatePizzaPrice(item.configuration, pricingCfg.basePrice);
        return { ...item, unit, lineTotal: unit * item.quantity };
      }),
    [items, pricingCfg.basePrice]
  );

  const onChange = (e) => setDelivery((d) => ({ ...d, [e.target.name]: e.target.value }));

  const validate = () => {
    const next = {};
    if (delivery.name.trim().length < 2) next.name = 'Enter the recipient name.';
    if (!/^[0-9+\-\s()]{7,20}$/.test(delivery.phone.trim())) next.phone = 'Enter a valid phone number.';
    if (delivery.address.trim().length < 5) next.address = 'Enter a delivery address.';
    if (delivery.city.trim().length < 2) next.city = 'Enter a city.';
    if (!/^[0-9A-Za-z\-\s]{4,12}$/.test(delivery.postalCode.trim())) next.postalCode = 'Enter a valid postal code.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const placeOrder = async () => {
    if (!validate()) {
      toast.error('Please complete your delivery details.');
      return;
    }
    if (preview && !preview.availability?.ok) {
      toast.error('Some ingredients went out of stock. Please review your pizzas.');
      return;
    }
    setPlacing(true);
    try {
      const order = await orderService.create({ items, delivery, note: delivery.instructions });
      toast.success('Order placed! Complete payment to start cooking.');
      navigate(`/my-orders/${order._id}`, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="container">
          <EmptyState title="Your cart is empty" action={<LinkButton to="/build">Build a pizza</LinkButton>}>
            Add a custom pizza or pick one from the menu to get started.
          </EmptyState>
        </div>
      </div>
    );
  }

  const pricing = preview?.pricing;
  const availability = preview?.availability;

  return (
    <div className="page">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Checkout</span>
          <h1>Review your order</h1>
        </div>

        <div className="checkout-grid">
          <div className="stack">
            <section className="panel">
              <h2>Your pizzas</h2>
              <div className="stack" style={{ gap: 'var(--space-4)' }}>
                {localLines.map((line) => (
                  <div key={line.key} className="cart-line">
                    <div style={{ flex: 1 }}>
                      <strong>{line.name}</strong>
                      <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                        {configSummary(line.configuration)}
                      </div>
                      <div className="cart-line__actions">
                        <div className="qty-control">
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.key, line.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span>{line.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.key, line.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="link-sm danger"
                          onClick={() => removeItem(line.key)}
                        >
                          <Trash2 size={13} style={{ verticalAlign: '-2px' }} /> Remove
                        </button>
                      </div>
                    </div>
                    <span className="price">{formatINR(line.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <Link to="/build" className="link-sm" style={{ display: 'inline-block', marginTop: 'var(--space-4)' }}>
                + Add another pizza
              </Link>
            </section>

            <section className="panel">
              <h2>Delivery details</h2>
              <div className="form-grid">
                <TextInput
                  label="Recipient name"
                  name="name"
                  value={delivery.name}
                  onChange={onChange}
                  error={errors.name}
                  required
                />
                <TextInput
                  label="Phone number"
                  name="phone"
                  value={delivery.phone}
                  onChange={onChange}
                  error={errors.phone}
                  required
                />
                <div className="form-grid__full">
                  <TextInput
                    label="Delivery address"
                    name="address"
                    value={delivery.address}
                    onChange={onChange}
                    error={errors.address}
                    required
                  />
                </div>
                <TextInput
                  label="City"
                  name="city"
                  value={delivery.city}
                  onChange={onChange}
                  error={errors.city}
                  required
                />
                <TextInput
                  label="Postal code"
                  name="postalCode"
                  value={delivery.postalCode}
                  onChange={onChange}
                  error={errors.postalCode}
                  required
                />
                <div className="form-grid__full">
                  <Textarea
                    label="Delivery instructions (optional)"
                    name="instructions"
                    value={delivery.instructions}
                    onChange={onChange}
                    rows={2}
                    maxLength={300}
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="panel order-summary" aria-label="Order summary">
            <h2>Order summary</h2>

            {previewError && <Alert tone="error">{previewError}</Alert>}
            {availability && !availability.ok && (
              <Alert tone="warning" title="Some items are unavailable">
                {availability.problems.map((p) => (
                  <div key={p.ingredient || p.name}>{p.message}</div>
                ))}
              </Alert>
            )}

            {loadingPreview && !pricing ? (
              <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
                <Skeleton height={18} />
                <Skeleton height={18} />
                <Skeleton height={18} />
              </div>
            ) : (
              <ul className="summary-list" style={{ marginTop: 'var(--space-3)' }}>
                <li>
                  <span>Subtotal</span>
                  <span>{formatINR(pricing?.subtotal ?? 0)}</span>
                </li>
                <li>
                  <span>Delivery fee</span>
                  <span>
                    {pricing?.deliveryFee ? formatINR(pricing.deliveryFee) : <span className="success">Free</span>}
                  </span>
                </li>
                <li>
                  <span>Tax ({Math.round((pricing?.taxRate ?? pricingCfg.taxRate) * 100)}%)</span>
                  <span>{formatINR(pricing?.tax ?? 0)}</span>
                </li>
              </ul>
            )}

            <div className="summary-total">
              <span>Total</span>
              <span>{formatINR(pricing?.total ?? 0)}</span>
            </div>

            {pricing && pricing.deliveryFee > 0 && (
              <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                <Info size={13} style={{ verticalAlign: '-2px' }} /> Add{' '}
                {formatINR(pricingCfg.freeDeliveryThreshold - pricing.subtotal)} more for free delivery.
              </p>
            )}

            <Button
              size="lg"
              loading={placing}
              disabled={loadingPreview || (availability && !availability.ok)}
              onClick={placeOrder}
              className="btn--block"
            >
              <ShoppingBag size={17} /> Place order &amp; pay
            </Button>

            <p className="muted" style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}>
              <ShieldCheck size={13} style={{ verticalAlign: '-2px' }} /> Prices are recalculated and
              verified by our kitchen before payment.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
