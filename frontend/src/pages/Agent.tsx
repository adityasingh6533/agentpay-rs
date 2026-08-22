import {
  Bot,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  MessageSquare,
  Package,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from "lucide-react";

import "../styles/Agent.css";
import AgentActivity from "../components/AgentActivity";
import AuditTrail from "../components/AuditTrail";

function Agent() {
  return (
    <div className="agent-page">
      {/* HEADER */}

      <div className="agent-page-header">
        <div>
          <div className="eyebrow">AUTONOMOUS COMMERCE</div>

          <div className="agent-heading">
            <div className="hero-agent-icon">
              <Bot size={25} />
            </div>

            <div>
              <h1>AI Revenue Agent</h1>

              <p>
                Your autonomous growth engine for intelligent commerce.
              </p>
            </div>
          </div>
        </div>

        <div className="agent-live">
          <span />
          Agent Active
        </div>
      </div>

      {/* MAIN */}

      <div className="agent-layout">
        {/* LEFT */}

        <section className="conversation-panel">
          <div className="conversation-header">
            <div>
              <span className="section-label">
                CUSTOMER SESSION
              </span>

              <div className="customer-heading">
                <div className="customer-avatar">
                  <User size={18} />
                </div>

                <div>
                  <strong>Rahul Sharma</strong>

                  <span>
                    New customer · High intent
                  </span>
                </div>
              </div>
            </div>

            <div className="session-id">
              <Clock3 size={13} />
              Session #AGT-8291
            </div>
          </div>

          {/* CONVERSATION */}

          <div className="conversation">
            {/* CUSTOMER MESSAGE */}

            <div className="message customer-message">
              <div className="message-avatar customer">
                <User size={14} />
              </div>

              <div>
                <span className="message-label">
                  RAHUL
                </span>

                <div className="bubble">
                  I need running shoes under ₹1500.
                </div>
              </div>
            </div>

            {/* AGENT MESSAGE */}

            <div className="message agent-message">
              <div className="message-avatar agent">
                <Bot size={14} />
              </div>

              <div className="agent-message-content">
                <span className="message-label purple-text">
                  AGENTPAY AI
                </span>

                <div className="bubble agent-bubble">
                  Absolutely. I found a high-rated running shoe
                  that fits your budget. Since you're looking for
                  running shoes, I also found a useful accessory
                  that many runners pair with them.
                </div>

                {/* PRODUCT RECOMMENDATION */}

                <div className="recommendation">
                  <div className="recommendation-image">
                    <Package size={30} />
                  </div>

                  <div className="recommendation-info">
                    <span className="recommendation-tag">
                      BEST MATCH
                    </span>

                    <strong>
                      Velocity Running Shoes
                    </strong>

                    <p>
                      Lightweight · 4.8★ · 2,340 reviews
                    </p>

                    <div className="recommendation-price">
                      ₹1,299

                      <span>
                        Free delivery
                      </span>
                    </div>
                  </div>

                  <button className="select-product">
                    Select
                    <ChevronRight size={15} />
                  </button>
                </div>

                {/* CROSS SELL */}

                <div className="cross-sell">
                  <div className="cross-icon">
                    <Zap size={15} />
                  </div>

                  <div>
                    <strong>
                      Smart cross-sell
                    </strong>

                    <p>
                      Add ProFit Running Socks for just ₹199.
                      Customers buying this shoe often purchase
                      them.
                    </p>
                  </div>

                  <button className="add-button">
                    + ₹199
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* INPUT */}

          <div className="chat-input">
            <MessageSquare size={17} />

            <input
              placeholder="Continue the conversation..."
              readOnly
            />

            <button>
              <Send size={16} />
            </button>
          </div>
        </section>

        {/* RIGHT SIDEBAR */}

        <aside className="agent-sidebar">
          {/* DECISION */}

          <div className="agent-card decision-card">
            <div className="card-heading">
              <div className="card-icon purple">
                <Sparkles size={17} />
              </div>

              <div>
                <span>AGENT DECISION</span>

                <strong>
                  Personalized bundle
                </strong>
              </div>
            </div>

            <div className="decision-box">
              <div>
                <span>Predicted AOV</span>
                <strong>₹1,498</strong>
              </div>

              <div>
                <span>Confidence</span>
                <strong>94%</strong>
              </div>
            </div>

            <div className="decision-reason">
              <strong>
                Why this action?
              </strong>

              <p>
                Customer has high purchase intent and the
                recommended accessory has strong historical
                affinity with this product.
              </p>
            </div>
          </div>

          {/* AGENT ACTIVITY */}

          <AgentActivity />

          {/* GUARDRAILS */}

          <div className="agent-card guardrail-card">
            <div className="card-title-row">
              <div>
                <span>SAFETY & CONTROL</span>

                <strong>
                  Action guardrails
                </strong>
              </div>

              <ShieldCheck size={17} />
            </div>

            <Guardrail
              text="Discount within merchant limit"
            />

            <Guardrail
              text="Product currently in stock"
            />

            <Guardrail
              text="Customer confirmation required"
            />

            <Guardrail
              text="Payment requires Razorpay checkout"
            />
          </div>

          {/* CHECKOUT */}

          <div className="checkout-card">
            <div className="checkout-top">
              <div>
                <span>READY TO CHECKOUT</span>

                <strong>
                  ₹1,498
                </strong>
              </div>

              <CircleDollarSign size={23} />
            </div>

            <div className="checkout-items">
              <span>
                Velocity Running Shoes
              </span>

              <span>
                ₹1,299
              </span>

              <span>
                ProFit Running Socks
              </span>

              <span>
                ₹199
              </span>
            </div>

            <button className="checkout-button">
              <CreditCard size={16} />

              Create Razorpay Order

              <ChevronRight size={16} />
            </button>
          </div>
        </aside>
      </div>

      {/* AUDIT TRAIL */}

      <div className="agent-audit-section">
        <AuditTrail />
      </div>
    </div>
  );
}

function Guardrail({
  text,
}: {
  text: string;
}) {
  return (
    <div className="guardrail">
      <div>
        <Check size={11} />
      </div>

      <span>
        {text}
      </span>

      <span className="guardrail-ok">
        PASS
      </span>
    </div>
  );
}

export default Agent;