import { useNavigate } from 'react-router-dom';
import { Leaf, Truck, BadgeIndianRupee, ShieldCheck, ChefHat, MousePointerClick, Sliders } from 'lucide-react';
import { useAsync } from '../hooks/useAsync.js';
import menuService from '../services/menuService.js';
import { Button, LinkButton } from '../components/ui/Button.jsx';
import { CardSkeletonGrid, ErrorState } from '../components/ui/Feedback.jsx';
import { PizzaCard } from '../components/pizza/PizzaCard.jsx';
import { ImageWithFallback } from '../components/common/ImageWithFallback.jsx';

const HERO_IMG =
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1100&q=80';

const STEPS = [
  { icon: MousePointerClick, title: 'Pick your base', text: 'Choose from five handcrafted crusts, from classic hand-tossed to cheese burst.' },
  { icon: Sliders, title: 'Sauce, cheese & veg', text: 'Stack your favourite sauces, cheeses and fresh vegetables. See the price update live.' },
  { icon: ChefHat, title: 'We fire it fresh', text: 'Our kitchen confirms stock in real time and bakes your pizza the moment it is paid.' },
  { icon: Truck, title: 'Track to your door', text: 'Follow every step — Order Received, In Kitchen and Sent to Delivery — live.' },
];

const BENEFITS = [
  { icon: Leaf, title: 'Fresh ingredients', text: 'Only ingredients that are actually in stock can be ordered, so every pizza is made fresh.' },
  { icon: BadgeIndianRupee, title: 'Transparent pricing', text: 'Every ingredient shows its exact price. Your total is calculated and verified by our servers.' },
  { icon: ShieldCheck, title: 'Secure checkout', text: 'Payments are verified server-side. We never trust a browser callback alone.' },
];

export function Home() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(
    () => menuService.listPizzas({ limit: 6, featured: 'true' }),
    []
  );

  const featured = (data?.items && data.items.length ? data.items : []).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow">Artisan pizza · Made your way</span>
            <h1 className="hero__title">
              Your Perfect Pizza, <em>Made Your Way.</em>
            </h1>
            <p className="hero__copy">
              Start with a fresh base, layer on sauces, cheese and crisp vegetables, and we will bake
              it to order. Fresh ingredients, honest pricing and live tracking from kitchen to door.
            </p>
            <div className="hero__cta">
              <LinkButton to="/build" size="lg">
                Order Your Pizza
              </LinkButton>
              <LinkButton to="/menu" variant="secondary" size="lg">
                Explore the Menu
              </LinkButton>
            </div>
            <div className="hero__trust">
              <div>
                <strong>5</strong>
                <span className="muted">crust styles</span>
              </div>
              <div>
                <strong>5</strong>
                <span className="muted">signature sauces</span>
              </div>
              <div>
                <strong>7+</strong>
                <span className="muted">fresh toppings</span>
              </div>
            </div>
          </div>
          <div className="hero__media">
            <ImageWithFallback src={HERO_IMG} alt="Freshly baked artisan pizza" />
            <div className="hero__badge">
              <ChefHat size={18} color="var(--color-primary)" /> Baked fresh to order
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Customer favourites</span>
            <h2>Featured pizzas, ready to customize</h2>
            <p className="muted">
              Every pizza is fully customizable — adjust the crust, sauce, cheese and toppings before
              you add it to your order.
            </p>
          </div>

          {loading && <CardSkeletonGrid count={3} />}
          {error && <ErrorState message={error.message} onRetry={reload} />}
          {!loading && !error && featured.length > 0 && (
            <div className="grid grid--3">
              {featured.map((pizza) => (
                <PizzaCard
                  key={pizza._id}
                  pizza={pizza}
                  onCustomize={(p) => navigate(`/build?pizza=${p._id}`)}
                />
              ))}
            </div>
          )}
          <div className="text-center" style={{ marginTop: 'var(--space-6)' }}>
            <LinkButton to="/menu" variant="secondary">
              View the full menu
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="section section--cream">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">How it works</span>
            <h2>Build a custom pizza in four simple steps</h2>
          </div>
          <div className="grid grid--4">
            {STEPS.map((step, i) => (
              <div className="feature" key={step.title}>
                <div className="step-number">{i + 1}</div>
                <div className="feature__icon">
                  <step.icon size={22} />
                </div>
                <h3>{step.title}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid--3">
            {BENEFITS.map((b) => (
              <div className="feature" key={b.title}>
                <div className="feature__icon">
                  <b.icon size={22} />
                </div>
                <h3>{b.title}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {b.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Hungry? Craft your pizza now.</h2>
              <p>Pick a base, choose your toppings and check out in minutes.</p>
            </div>
            <Button variant="secondary" size="lg" onClick={() => navigate('/build')}>
              Start building
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
