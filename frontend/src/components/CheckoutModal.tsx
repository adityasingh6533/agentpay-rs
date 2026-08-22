import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import "../styles/CheckoutModal.css";

type CheckoutModalProps = {
  open: boolean;
  onClose: () => void;
};

function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  if (!open) return null;

  return (
    <div className="checkout-overlay">
      <div className="checkout-modal">
        {/* HEADER */}

        <div className="checkout-header">
          <div>
            <span className="checkout-eyebrow">
              SECURE CHECKOUT
            </span>

            <h2>Review your order</h2>
          </div>

          <button className="checkout-close" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        {/* AI SUMMARY */}

        <div className="checkout-ai">
          <div className="checkout-ai-icon">
            <Bot size={17} />
          </div>

          <div>
            <div className="checkout-ai-title">
              <strong>AgentPay AI</strong>

              <span>
                <Sparkles size={9} />
                Optimized
              </span>
            </div>

            <p>
              I found a bundle that saves you ₹100 while keeping
              your selected products unchanged.
            </p>
          </div>
        </div>

        {/* ORDER */}

        <div className="checkout-section">
          <div className="checkout-section-title">
            <span>ORDER SUMMARY</span>
            <strong>2 items</strong>
          </div>

          <CheckoutItem
            name="Velocity Running Shoes"
            description="Running · Size 9"
            price="₹1,299"
          />

          <CheckoutItem
            name="ProFit Running Socks"
            description="Performance · Black"
            price="₹199"
          />
        </div>

        {/* AI BENEFIT */}

        <div className="checkout-benefit">
          <div className="benefit-icon">
            <Sparkles size={14} />
          </div>

          <div>
            <strong>AI bundle discount applied</strong>

            <p>
              You saved ₹100 because these products are frequently
              purchased together.
            </p>
          </div>

          <span>-₹100</span>
        </div>

        {/* TOTAL */}

        <div className="checkout-total">
          <div>
            <span>Subtotal</span>
            <strong>₹1,498</strong>
          </div>

          <div>
            <span>AI Discount</span>
            <strong className="checkout-green">-₹100</strong>
          </div>

          <div>
            <span>Delivery</span>
            <strong className="checkout-green">FREE</strong>
          </div>

          <div className="checkout-grand-total">
            <span>Total payable</span>
            <strong>₹1,398</strong>
          </div>
        </div>

        {/* CONSENT */}

        <div className="checkout-consent">
          <div className="consent-check">
            <Check size={11} />
          </div>

          <p>
            I confirm my order details and authorize the payment
            of <strong>₹1,398</strong>.
          </p>
        </div>

        {/* SECURITY */}

        <div className="checkout-security-box">
          <div>
            <ShieldCheck size={14} />
            <span>Merchant policy verified</span>
          </div>

          <div>
            <Lock size={14} />
            <span>Payment secured by Razorpay</span>
          </div>
        </div>

        {/* ACTIONS */}

        <div className="checkout-actions">
          <button className="back-button" onClick={onClose}>
            <ArrowLeft size={14} />
            Back
          </button>

          <button className="pay-button">
            Pay ₹1,398
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="checkout-footer">
          <Lock size={10} />
          Your payment information is encrypted and secure.
        </div>
      </div>
    </div>
  );
}

function CheckoutItem({
  name,
  description,
  price,
}: {
  name: string;
  description: string;
  price: string;
}) {
  return (
    <div className="checkout-item">
      <div className="checkout-item-image">
        <div />
      </div>

      <div className="checkout-item-info">
        <strong>{name}</strong>
        <span>{description}</span>
      </div>

      <strong className="checkout-item-price">{price}</strong>
    </div>
  );
}

export default CheckoutModal;