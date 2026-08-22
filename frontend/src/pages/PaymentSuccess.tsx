import {
  ArrowRight,
  Bot,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Package,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Zap,
} from "lucide-react";
import "../styles/PaymentSuccess.css";

function PaymentSuccess() {
  return (
    <div className="success-page">
      {/* NAV */}

      <header className="success-nav">
        <div className="success-brand">
          <div className="success-brand-icon">
            <Zap size={16} />
          </div>

          <strong>Acme Store</strong>
        </div>

        <div className="success-secure">
          <ShieldCheck size={13} />
          Secure transaction
        </div>
      </header>

      {/* CONTENT */}

      <main className="success-content">
        {/* SUCCESS HERO */}

        <section className="success-hero">
          <div className="success-check">
            <Check size={30} strokeWidth={2.5} />
          </div>

          <div className="success-label">
            <span />
            PAYMENT SUCCESSFUL
          </div>

          <h1>Order confirmed.</h1>

          <p>
            Your payment was successfully processed and your order
            is now being prepared.
          </p>

          <div className="success-order-id">
            <span>ORDER ID</span>

            <strong>ORD-AGT-8291</strong>

            <button>
              <Copy size={12} />
            </button>
          </div>
        </section>

        {/* MAIN GRID */}

        <div className="success-grid">
          {/* ORDER */}

          <section className="success-card order-card">
            <div className="success-card-header">
              <div>
                <span>ORDER DETAILS</span>
                <strong>Your purchase</strong>
              </div>

              <ShoppingBag size={18} />
            </div>

            <SuccessItem
              name="Velocity Running Shoes"
              description="Size 9 · Running"
              price="₹1,299"
            />

            <SuccessItem
              name="ProFit Running Socks"
              description="Black · Performance"
              price="₹199"
            />

            <div className="success-divider" />

            <div className="success-row">
              <span>Subtotal</span>
              <strong>₹1,498</strong>
            </div>

            <div className="success-row">
              <span>AI Bundle Discount</span>
              <strong className="success-green">-₹100</strong>
            </div>

            <div className="success-row">
              <span>Delivery</span>
              <strong className="success-green">FREE</strong>
            </div>

            <div className="success-total">
              <span>Total paid</span>
              <strong>₹1,398</strong>
            </div>
          </section>

          {/* PAYMENT */}

          <section className="success-card payment-card">
            <div className="success-card-header">
              <div>
                <span>PAYMENT</span>
                <strong>Transaction details</strong>
              </div>

              <ShieldCheck size={18} />
            </div>

            <PaymentRow
              label="Payment status"
              value="Captured"
              green
            />

            <PaymentRow
              label="Payment method"
              value="UPI"
            />

            <PaymentRow
              label="Payment ID"
              value="pay_N7k29Lm"
            />

            <PaymentRow
              label="Razorpay order"
              value="order_Rz8K29x"
            />

            <PaymentRow
              label="Amount"
              value="₹1,398"
            />

            <div className="payment-verified">
              <Check size={13} />

              <div>
                <strong>Payment verified</strong>
                <span>
                  Razorpay payment signature validated successfully.
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* AI FOLLOW UP */}

        <section className="ai-success-card">
          <div className="ai-success-icon">
            <Bot size={20} />
          </div>

          <div className="ai-success-content">
            <div className="ai-success-title">
              <span>AGENTPAY AI</span>

              <div>
                <Sparkles size={10} />
                POST-PURCHASE ACTION
              </div>
            </div>

            <h2>Your order is now in the fulfillment pipeline.</h2>

            <p>
              I recorded your purchase preferences and can use them to
              improve future recommendations. No additional action is
              required from you.
            </p>

            <div className="ai-success-actions">
              <div>
                <Check size={11} />
                Preference recorded
              </div>

              <div>
                <Check size={11} />
                Payment verified
              </div>

              <div>
                <Check size={11} />
                Merchant notified
              </div>
            </div>
          </div>

          <div className="ai-next">
            <span>Next update</span>

            <strong>
              <Clock3 size={12} />
              2–4 hours
            </strong>
          </div>
        </section>

        {/* TIMELINE */}

        <section className="success-card timeline-card">
          <div className="success-card-header">
            <div>
              <span>ORDER TIMELINE</span>
              <strong>What's happening next</strong>
            </div>

            <Package size={18} />
          </div>

          <div className="order-timeline">
            <TimelineStep
              active
              title="Payment confirmed"
              description="Payment successfully captured"
              time="Just now"
            />

            <TimelineStep
              active
              title="Order confirmed"
              description="Merchant has received your order"
              time="Just now"
            />

            <TimelineStep
              title="Preparing your order"
              description="Merchant will prepare your items"
              time="Next"
            />

            <TimelineStep
              title="Out for delivery"
              description="Your order will be handed to the courier"
              time="Upcoming"
            />
          </div>
        </section>

        {/* ACTIONS */}

        <div className="success-actions">
          <button className="secondary-success-button">
            <ExternalLink size={14} />
            View order
          </button>

          <button className="primary-success-button">
            Continue shopping
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="success-footer">
          <ShieldCheck size={11} />
          Payment secured and processed by Razorpay
        </div>
      </main>
    </div>
  );
}

function SuccessItem({
  name,
  description,
  price,
}: {
  name: string;
  description: string;
  price: string;
}) {
  return (
    <div className="success-item">
      <div className="success-product-icon">
        <Package size={17} />
      </div>

      <div>
        <strong>{name}</strong>
        <span>{description}</span>
      </div>

      <strong>{price}</strong>
    </div>
  );
}

function PaymentRow({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="payment-row">
      <span>{label}</span>

      <strong className={green ? "success-green" : ""}>
        {green && <Check size={10} />}
        {value}
      </strong>
    </div>
  );
}

function TimelineStep({
  active = false,
  title,
  description,
  time,
}: {
  active?: boolean;
  title: string;
  description: string;
  time: string;
}) {
  return (
    <div className="timeline-step">
      <div className="timeline-marker-column">
        <div
          className={
            active
              ? "timeline-marker active"
              : "timeline-marker"
          }
        >
          {active && <Check size={10} />}
        </div>
      </div>

      <div className="timeline-step-content">
        <div>
          <strong>{title}</strong>
          <span>{time}</span>
        </div>

        <p>{description}</p>
      </div>
    </div>
  );
}

export default PaymentSuccess;