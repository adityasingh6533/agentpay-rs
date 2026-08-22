import {
  ArrowRight,
  Bot,
  Check,
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
import "../styles/Shop.css";
import { useState } from "react";
import CheckoutModal from "../components/CheckoutModal";

const recommendations = [
  {
    name: "Velocity Running Shoes",
    description: "Lightweight daily running shoe",
    price: "₹1,299",
    rating: "4.8",
    reviews: "2,340",
    tag: "BEST MATCH",
    selected: true,
  },
  {
    name: "Aero Sports Jacket",
    description: "Breathable performance layer",
    price: "₹1,899",
    rating: "4.7",
    reviews: "840",
    tag: "TRENDING",
    selected: false,
  },
  {
    name: "FlexRun Sports Shorts",
    description: "Flexible training shorts",
    price: "₹899",
    rating: "4.6",
    reviews: "1,120",
    tag: "POPULAR",
    selected: false,
  },
];

function Shop() {
  // CHECKOUT MODAL STATE
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <div className="shop-page">
      {/* TOP NAV */}

      <header className="shop-nav">
        <div className="shop-brand">
          <div className="shop-brand-mark">
            <Zap size={17} />
          </div>

          <strong>Acme Store</strong>
        </div>

        <div className="shop-search">
          <Search size={15} />
          <input placeholder="Search products..." />
        </div>

        <div className="shop-nav-actions">
          <button>
            <Heart size={17} />
          </button>

          <button className="cart-button">
            <ShoppingBag size={17} />
            <span>2</span>
          </button>

          <div className="shop-user">RS</div>
        </div>
      </header>

      {/* MAIN */}

      <main className="shop-content">
        <div className="shop-breadcrumb">
          <span>Home</span>
          <ChevronRight size={12} />
          <span>AI Shopping</span>
        </div>

        <div className="shop-layout">
          {/* LEFT */}

          <section className="shopping-main">
            {/* AI HERO */}

            <div className="shopping-hero">
              <div className="shopping-hero-content">
                <div className="ai-label">
                  <Sparkles size={12} />
                  AI SHOPPING ASSISTANT
                </div>

                <h1>
                  Find exactly what
                  <br />
                  you're looking for.
                </h1>

                <p>
                  Tell me what you need and I'll find the best products
                  for you.
                </p>

                <div className="ai-search">
                  <MessageCircle size={17} />

                  <input
                    value="I need running shoes under ₹1500"
                    readOnly
                  />

                  <button>
                    <ArrowRight size={15} />
                  </button>
                </div>

                <div className="quick-prompts">
                  <span>Try:</span>

                  <button>Best shoes for running</button>
                  <button>Something under ₹1000</button>
                  <button>Complete my outfit</button>
                </div>
              </div>

              <div className="hero-bot">
                <div className="hero-bot-ring">
                  <Bot size={42} />
                </div>

                <span>AI</span>
              </div>
            </div>

            {/* AI RESPONSE */}

            <div className="ai-response">
              <div className="response-header">
                <div className="response-agent">
                  <div>
                    <Bot size={15} />
                  </div>

                  <strong>AgentPay AI</strong>

                  <span>· Just now</span>
                </div>

                <span className="confidence">
                  94% match
                </span>
              </div>

              <p>
                I found the best match for your budget. I also noticed
                you're shopping specifically for running, so I've included
                products that work well for that use case.
              </p>
            </div>

            {/* PRODUCTS */}

            <div className="products-header">
              <div>
                <h2>Recommended for you</h2>
                <p>Personalized based on your request</p>
              </div>

              <button>
                Sort: Relevance
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="product-grid">
              {recommendations.map((product) => (
                <ShopProduct
                  key={product.name}
                  product={product}
                />
              ))}
            </div>
          </section>

          {/* RIGHT CART */}

          <aside className="shop-cart">
            <div className="cart-header">
              <div>
                <span>YOUR CART</span>
                <h2>2 items</h2>
              </div>

              <ShoppingBag size={19} />
            </div>

            <CartItem
              name="Velocity Running Shoes"
              price="₹1,299"
              quantity="1"
            />

            <CartItem
              name="ProFit Running Socks"
              price="₹199"
              quantity="1"
            />

            {/* SMART BUNDLE */}

            <div className="smart-bundle">
              <div className="bundle-icon">
                <Sparkles size={14} />
              </div>

              <div>
                <span>AI SAVING</span>

                <strong>
                  Complete your running bundle
                </strong>

                <p>
                  You're eligible for 10% off when you add the
                  recommended accessory.
                </p>
              </div>
            </div>

            {/* SUMMARY */}

            <div className="cart-summary">
              <SummaryRow
                label="Subtotal"
                value="₹1,498"
              />

              <SummaryRow
                label="AI Bundle Discount"
                value="-₹100"
                green
              />

              <SummaryRow
                label="Delivery"
                value="FREE"
                green
              />

              <div className="summary-total">
                <span>Total</span>
                <strong>₹1,398</strong>
              </div>
            </div>

            {/* CHECKOUT BUTTON */}

            <button
              className="checkout-button"
              onClick={() => setCheckoutOpen(true)}
            >
              Continue to Razorpay
              <ArrowRight size={16} />
            </button>

            <div className="checkout-security">
              <ShieldCheck size={13} />
              Secure checkout powered by Razorpay
            </div>

            {/* AGENT EXPLANATION */}

            <div className="agent-note">
              <div className="agent-note-icon">
                <Bot size={14} />
              </div>

              <div>
                <strong>Why this recommendation?</strong>

                <p>
                  68% of customers who bought these shoes also purchased
                  these socks.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* AI FLOATING BUTTON */}

      <button className="floating-agent">
        <Bot size={17} />
        Ask AI
      </button>

      {/* CHECKOUT MODAL */}

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />
    </div>
  );
}

function ShopProduct({
  product,
}: {
  product: (typeof recommendations)[number];
}) {
  return (
    <div className="shop-product">
      <div className="shop-product-image">
        <Package size={42} />

        <button className="heart-button">
          <Heart size={15} />
        </button>

        <span>{product.tag}</span>
      </div>

      <div className="shop-product-info">
        <div className="rating">
          <Star size={11} fill="currentColor" />
          {product.rating}
          <span>({product.reviews})</span>
        </div>

        <h3>{product.name}</h3>

        <p>{product.description}</p>

        <div className="shop-product-bottom">
          <strong>{product.price}</strong>

          <button>
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

export default Shop;