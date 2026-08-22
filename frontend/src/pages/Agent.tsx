import {
  Bot,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import * as React from "react";

import "../styles/Agent.css";

import AgentActivity from "../components/AgentActivity";
import AuditTrail from "../components/AuditTrail";
import ChatPanel from "../components/ChatPanel";
import CheckoutModal from "../components/CheckoutModal";

import {
  AgentProvider,
  useAgentContext,
} from "../context/AgentContext";

function Agent() {
  const customerId =
    process.env.REACT_APP_CUSTOMER_ID ||
    "demo-customer";

  return (
    <AgentProvider
      customerId={customerId}
    >
      <AgentContent />
    </AgentProvider>
  );
}

function AgentContent() {
  const {
    status,
    session,
    decision,
    cart,
    lastAction,
    isLoading,
    error,
    canExecute,
    loadAuditTrail,
  } = useAgentContext();

  const handleOpenCheckout = () => {
    if (!lastAction) {
      return;
    }

    if (!canExecute) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("agent:open-checkout")
    );
  };

  return (
    <div className="agent-page">

      {/* =================================================
          HEADER
      ================================================= */}

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
              <h1>
                AI Revenue Agent
              </h1>

              <p>
                Your autonomous growth engine for
                intelligent commerce.
              </p>
            </div>
          </div>
        </div>

        <div
          className={
            status === "BLOCKED" ||
            status === "FAILED"
              ? "agent-live danger"
              : "agent-live"
          }
        >
          <span />

          {formatAgentStatus(status)}
        </div>
      </div>

      {/* =================================================
          MAIN
      ================================================= */}

      <div className="agent-layout">

        {/* LEFT */}

        <section className="conversation-panel">
          <ChatPanel />
        </section>

        {/* RIGHT */}

        <aside className="agent-sidebar">

          {/* =================================================
              DECISION
          ================================================= */}

          <div className="agent-card decision-card">

            <div className="card-heading">

              <div className="card-icon purple">
                <Sparkles size={17} />
              </div>

              <div>
                <span>
                  AGENT DECISION
                </span>

                <strong>
                  {decision
                    ? formatDecisionType(
                        decision.type
                      )
                    : "Waiting for request"}
                </strong>
              </div>

            </div>

            <div className="decision-box">

              <div>
                <span>
                  Predicted AOV
                </span>

                <strong>
                  {decision?.cart
                    ? formatCurrency(
                        decision.cart.total
                      )
                    : "—"}
                </strong>
              </div>

              <div>
                <span>
                  Confidence
                </span>

                <strong>
                  {decision
                    ? `${decision.confidence}%`
                    : "—"}
                </strong>
              </div>

            </div>

            <div className="decision-reason">

              <strong>
                Why this action?
              </strong>

              <p>
                {decision?.reasoning ??
                  "The agent will explain its decision after processing the customer's request."}
              </p>

            </div>

          </div>

          {/* =================================================
              ACTIVITY
          ================================================= */}

          <AgentActivity />

          {/* =================================================
              GUARDRAILS
          ================================================= */}

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

            {decision?.guardrails?.length ? (
              decision.guardrails.map(
                (guardrail) => (
                  <Guardrail
                    key={guardrail.id}
                    text={guardrail.name}
                    status={
                      guardrail.status
                    }
                  />
                )
              )
            ) : (
              <div className="guardrail-empty">

                <ShieldCheck size={13} />

                <span>
                  Waiting for agent decision
                </span>

              </div>
            )}

          </div>

          {/* =================================================
              CHECKOUT
          ================================================= */}

          <div className="checkout-card">

            <div className="checkout-top">

              <div>
                <span>
                  CHECKOUT STATUS
                </span>

                <strong>
                  {cart
                    ? formatCurrency(
                        cart.total
                      )
                    : "—"}
                </strong>
              </div>

              <CircleDollarSign size={23} />

            </div>

            {cart?.items?.length ? (

              <div className="checkout-items">

                {cart.items.map(
                  (item) => (
                    <div
                      key={
                        item.productId
                      }
                      className="checkout-item-row"
                    >

                      <span>
                        {item.productName}
                        {" × "}
                        {item.quantity}
                      </span>

                      <span>
                        {formatCurrency(
                          item.totalPrice
                        )}
                      </span>

                    </div>
                  )
                )}

              </div>

            ) : (

              <div className="checkout-empty">
                Cart will appear here after
                the agent selects products.
              </div>

            )}

            <button
              className="checkout-button"
              disabled={
                !canExecute ||
                isLoading ||
                !cart
              }
              onClick={
                handleOpenCheckout
              }
            >

              <CreditCard size={16} />

              {canExecute
                ? "Open secure checkout"
                : status ===
                  "AWAITING_CONFIRMATION"
                ? "Customer confirmation required"
                : "Authorization required"}

              <ChevronRight size={16} />

            </button>

            {error && (
              <div className="checkout-error">
                {error.message}
              </div>
            )}

          </div>

        </aside>

      </div>

      {/* =================================================
          AUDIT
      ================================================= */}

      <div className="agent-audit-section">
        <AuditTrail />
      </div>

      {/* =================================================
          CHECKOUT MODAL
      ================================================= */}

      <CheckoutController
        sessionId={session?.id}
        customerId={
          process.env.REACT_APP_CUSTOMER_ID ||
          "demo-customer"
        }
        cart={cart}
        action={lastAction}
        onSuccess={async () => {
          await loadAuditTrail();
        }}
      />

    </div>
  );
}

/* =========================================================
   CHECKOUT CONTROLLER
   ========================================================= */

function CheckoutController({
  sessionId,
  customerId,
  cart,
  action,
  onSuccess,
}: {
  sessionId?: string;
  customerId: string;
  cart: any;
  action: any;
  onSuccess: () => Promise<void>;
}) {
  const [open, setOpen] =
    React.useState(false);

  React.useEffect(() => {
    const handler = () =>
      setOpen(true);

    window.addEventListener(
      "agent:open-checkout",
      handler
    );

    return () =>
      window.removeEventListener(
        "agent:open-checkout",
        handler
      );
  }, []);

  return (
    <CheckoutModal
      open={open}
      sessionId={sessionId}
      customerId={customerId}
      cart={cart}
      action={action}
      onClose={() =>
        setOpen(false)
      }
      onSuccess={async (
        checkout
      ) => {
        await onSuccess();
      }
      }
    />
  );
}

/* =========================================================
   GUARDRAIL
   ========================================================= */

function Guardrail({
  text,
  status,
}: {
  text: string;
  status:
    | "PASS"
    | "BLOCKED"
    | "REVIEW_REQUIRED";
}) {
  const isPass =
    status === "PASS";

  const isBlocked =
    status === "BLOCKED";

  return (
    <div
      className={`guardrail ${status.toLowerCase()}`}
    >

      <div>
        {isPass ? (
          <Check size={11} />
        ) : (
          <ShieldCheck size={11} />
        )}
      </div>

      <span>
        {text}
      </span>

      <span className="guardrail-ok">
        {isPass
          ? "PASS"
          : isBlocked
          ? "BLOCKED"
          : "REVIEW"}
      </span>

    </div>
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function formatCurrency(
  amount: number
) {
  return `₹${amount.toLocaleString(
    "en-IN"
  )}`;
}

function formatAgentStatus(
  status: string
) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDecisionType(
  type: string
) {
  return type
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

export default Agent;
