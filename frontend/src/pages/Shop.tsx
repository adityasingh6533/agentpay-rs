import {
  ArrowRight,
  Bot,
  ChevronRight,
  Heart,
  MessageCircle,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import "../styles/Shop.css";
import api from "../services/api";
import type { Product } from "../types";

type CartLine = {
  product: Product;
  quantity: number;
};

function Shop() {
  const navigate = useNavigate();
  const [products, setProducts] =
    useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loadError, setLoadError] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    api.catalog
      .listProducts({ limit: 50 })
      .then((items) => {
        if (mounted) {
          setProducts(items);
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (mounted) {
          setProducts([]);
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load products."
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const normalized = query.toLowerCase().trim();

    if (!normalized) {
      return products;
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.description
          .toLowerCase()
          .includes(normalized) ||
        product.category.toLowerCase().includes(normalized)
    );
  }, [products, query]);

  const featuredProducts = filteredProducts.slice(0, 6);
  const subtotal = cart.reduce(
    (total, line) =>
      total + line.product.price * line.quantity,
    0
  );

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find(
        (line) => line.product.id === product.id
      );

      if (existing) {
        return current.map((line) =>
          line.product.id === product.id
            ? {
                ...line,
                quantity: line.quantity + 1,
              }
            : line
        );
      }

      return [
        ...current,
        {
          product,
          quantity: 1,
        },
      ];
    });
  };

  const askAgent = () => {
    navigate("/agent");
  };

  return (
    <div className="shop-page">
      <header className="shop-nav">
        <div className="shop-brand">
          <div className="shop-brand-mark">
            <Zap size={17} />
          </div>

          <strong>Acme Store</strong>
        </div>

        <div className="shop-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search backend catalog..."
          />
        </div>

        <div className="shop-nav-actions">
          <button>
            <Heart size={17} />
          </button>

          <button className="cart-button">
            <ShoppingBag size={17} />
            <span>{cart.length}</span>
          </button>

          <div className="shop-user">AI</div>
        </div>
      </header>

      <main className="shop-content">
        <div className="shop-breadcrumb">
          <span>Home</span>
          <ChevronRight size={12} />
          <span>Backend catalog</span>
        </div>

        <div className="shop-layout">
          <section className="shopping-main">
            <div className="shopping-hero">
              <div className="shopping-hero-content">
                <div className="ai-label">
                  <Sparkles size={12} />
                  AI SHOPPING ASSISTANT
                </div>

                <h1>
                  Buy from the same catalog
                  <br />
                  the agent can authorize.
                </h1>

                <p>
                  Products, prices and stock are loaded from the
                  backend catalog used by the AI agent.
                </p>

                <div className="ai-search">
                  <MessageCircle size={17} />

                  <input
                    value="I need running shoes under Rs 1500"
                    readOnly
                  />

                  <button onClick={askAgent}>
                    <ArrowRight size={15} />
                  </button>
                </div>

                <div className="quick-prompts">
                  <span>Try:</span>
                  <button onClick={askAgent}>
                    Running bundle
                  </button>
                  <button onClick={askAgent}>
                    Budget cap
                  </button>
                  <button onClick={askAgent}>
                    Out of catalog
                  </button>
                </div>
              </div>

              <div className="hero-bot">
                <div className="hero-bot-ring">
                  <Bot size={42} />
                </div>

                <span>AI</span>
              </div>
            </div>

            <div className="ai-response">
              <div className="response-header">
                <div className="response-agent">
                  <div>
                    <Bot size={15} />
                  </div>

                  <strong>AgentPay AI</strong>
                  <span>Live catalog</span>
                </div>

                <span className="confidence">
                  {products.length} products
                </span>
              </div>

              <p>
                This page is a customer storefront preview. The
                actual money movement still happens only through the
                signed-intent authorization flow on the AI Agent page.
              </p>
            </div>

            <div className="products-header">
              <div>
                <h2>Backend catalog</h2>
                <p>
                  {loadError ||
                    "Search and add products from the live API."}
                </p>
              </div>

              <button>
                Sort: Relevance
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="product-grid">
              {featuredProducts.map((product, index) => (
                <ShopProduct
                  key={product.id}
                  product={product}
                  tag={
                    index === 0
                      ? "BEST MATCH"
                      : product.stock < 10
                      ? "LOW STOCK"
                      : "CATALOG"
                  }
                  onAdd={() => addToCart(product)}
                />
              ))}
            </div>
          </section>

          <aside className="shop-cart">
            <div className="cart-header">
              <div>
                <span>YOUR CART</span>
                <h2>
                  {cart.length} item
                  {cart.length === 1 ? "" : "s"}
                </h2>
              </div>

              <ShoppingBag size={19} />
            </div>

            {cart.length === 0 ? (
              <div className="agent-note">
                <div className="agent-note-icon">
                  <Bot size={14} />
                </div>

                <div>
                  <strong>No cart yet</strong>
                  <p>
                    Add a product or ask the agent to build a
                    guarded checkout bundle.
                  </p>
                </div>
              </div>
            ) : (
              cart.map((line) => (
                <CartItem
                  key={line.product.id}
                  name={line.product.name}
                  price={formatCurrency(
                    line.product.price
                  )}
                  quantity={`${line.quantity}`}
                />
              ))
            )}

            <div className="smart-bundle">
              <div className="bundle-icon">
                <Sparkles size={14} />
              </div>

              <div>
                <span>AI CHECKOUT RULE</span>

                <strong>
                  Agent authorization required
                </strong>

                <p>
                  The storefront can collect intent, but checkout is
                  gated by policy, confirmation and audit logs.
                </p>
              </div>
            </div>

            <div className="cart-summary">
              <SummaryRow
                label="Subtotal"
                value={formatCurrency(subtotal)}
              />

              <SummaryRow
                label="Agent guardrail"
                value="Required"
                green
              />

              <SummaryRow
                label="Audit trail"
                value="Enabled"
                green
              />

              <div className="summary-total">
                <span>Total</span>
                <strong>
                  {formatCurrency(subtotal)}
                </strong>
              </div>
            </div>

            <button
              className="checkout-button"
              onClick={askAgent}
            >
              Continue with AI Agent
              <ArrowRight size={16} />
            </button>

            <div className="checkout-security">
              <ShieldCheck size={13} />
              Secure checkout powered by Razorpay test mode
            </div>

            <div className="agent-note">
              <div className="agent-note-icon">
                <Bot size={14} />
              </div>

              <div>
                <strong>Why this matters</strong>

                <p>
                  Judges can see the storefront, catalog, policy
                  gate and Razorpay order flow are connected.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <button
        className="floating-agent"
        onClick={askAgent}
      >
        <Bot size={17} />
        Ask AI
      </button>
    </div>
  );
}

function ShopProduct({
  product,
  tag,
  onAdd,
}: {
  product: Product;
  tag: string;
  onAdd: () => void;
}) {
  return (
    <div className="shop-product">
      <div className="shop-product-image">
        <Package size={42} />

        <button className="heart-button">
          <Heart size={15} />
        </button>

        <span>{tag}</span>
      </div>

      <div className="shop-product-info">
        <div className="rating">
          <Star size={11} fill="currentColor" />
          {Number(product.rating || 0).toFixed(1)}
          <span>
            ({Number(product.reviewCount || 0).toLocaleString("en-IN")})
          </span>
        </div>

        <h3>{product.name}</h3>

        <p>{product.description}</p>

        <div className="shop-product-bottom">
          <strong>
            {formatCurrency(product.price)}
          </strong>

          <button onClick={onAdd}>
            <Plus size={13} />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function CartItem({
  name,
  price,
  quantity,
}: {
  name: string;
  price: string;
  quantity: string;
}) {
  return (
    <div className="cart-item">
      <div className="cart-item-image">
        <Package size={18} />
      </div>

      <div className="cart-item-info">
        <strong>{name}</strong>
        <span>Qty: {quantity}</span>
      </div>

      <strong>{price}</strong>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="summary-row">
      <span>{label}</span>

      <strong className={green ? "green-text" : ""}>
        {value}
      </strong>
    </div>
  );
}

function formatCurrency(amount: number) {
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

export default Shop;
