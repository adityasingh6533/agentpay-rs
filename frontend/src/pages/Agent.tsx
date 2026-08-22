import {
  Bot,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import "../styles/Agent.css";

import AgentActivity from "../components/AgentActivity";
import AuditTrail from "../components/AuditTrail";
import ChatPanel from "../components/ChatPanel";
import RecommendationCard from "../components/RecommendationCard";

function Agent() {
  return (
    <div className="agent-page">
      {/* HEADER */}

      <div className="agent-page-header">
        <div>
          <div className="eyebrow">
            AUTONOMOUS COMMERCE
          </div>

          <div className="agent-heading">
            <div className="hero-agent-icon">
              <Bot size={25} />
            </div>

            <div>
              <h1>AI Revenue Agent</h1>

              <p>
                Your autonomous growth engine for intelligent
                commerce.
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
        {/* LEFT — INTERACTIVE CHAT */}

        <section className="conversation-panel">
          <ChatPanel />

          {/* AI RECOMMENDATION */}

          <div className="agent-recommendation-section">
            <RecommendationCard
              recommendation={{
                productName:
                  "Velocity Running Shoes",

                description:
                  "Lightweight daily running shoe",

                price: 1299,

                rating: 4.8,

                reviews: "2,340",

                matchScore: 94,

                reason:
                  "Customer requested running shoes under ₹1500. This product has the strongest rating, conversion rate and historical purchase affinity within the customer's budget.",

                expectedAOV: 1498,

                tag: "BEST MATCH",

                crossSell: {
                  name: "ProFit Running Socks",

                  price: 199,

                  reason:
                    "68% of customers buying these shoes also purchase this accessory.",
                },
              }}

              onSelect={() => {
                console.log(
                  "Recommendation selected"
                );
              }}

              onAddCrossSell={() => {
                console.log(
                  "Cross-sell added"
                );
              }}
            />
          </div>
        </section>

        {/* RIGHT SIDEBAR */}

        <aside className="agent-sidebar">
          {/* AGENT DECISION */}

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

                <strong>
                  ₹1,498
                </strong>
              </div>

              <div>
                <span>Confidence</span>

                <strong>
                  94%
                </strong>
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
                <span>
                  SAFETY & CONTROL
                </span>

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
                <span>
                  READY TO CHECKOUT
                </span>

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

/* GUARDRAIL */

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