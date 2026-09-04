import {
  Bot,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileCheck2,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { ElementType } from "react";

import "../styles/Agent.css";

import AgentActivity from "../components/AgentActivity";
import AuditTrail from "../components/AuditTrail";
import ChatPanel from "../components/ChatPanel";
import RecommendationCard from "../components/RecommendationCard";

import {
  useAgentContext,
} from "../context/AgentContext";

function Agent() {
  return <AgentContent />;
}

function AgentContent() {
  const {
    status,
    decision,
    currentRecommendation,
    agentResult,
    cart,
    authorization,
    checkoutResult,
    paymentResult,
    isLoading,
    error,
    canExecute,
    canPay,
    executeCheckout,
    payWithRazorpay,
  } = useAgentContext();

  const primaryPrice =
    currentRecommendation?.product.price ?? 0;
  const predictedAov =
    cart?.total ?? primaryPrice;
  const aovLift =
    predictedAov && primaryPrice
      ? predictedAov - primaryPrice
      : 0;
  const checkoutPhase =
    paymentResult.status === "SUCCESS"
      ? "paid"
      : canPay ||
        status === "PAYMENT_PENDING"
      ? "payment"
      : checkoutResult
      ? "order"
      : authorization
      ? "authorized"
      : "locked";

  const handleCheckoutAction = async () => {
    if (
      (!canExecute && !canPay) ||
      isLoading ||
      !cart
    ) {
      return;
    }

    if (canPay) {
      await payWithRazorpay();
      return;
    }

    await executeCheckout();
  };

  return (
    <div className="agent-page">

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
                Backend-driven recommendations, guarded
                checkout and complete auditability.
              </p>
            </div>
          </div>
        </div>

        <div
          className={
            status === "BLOCKED" ||
            status === "FAILED" ||
            status === "OUT_OF_CATALOG"
              ? "agent-live danger"
              : "agent-live"
          }
        >
          <span />
          {formatAgentStatus(status)}
        </div>
      </div>

      <div className="agent-proof-strip">
        <ProofTile
          icon={TrendingUp}
          label="Revenue proof"
          value={
            cart
              ? formatCurrency(predictedAov)
              : "Waiting"
          }
          detail={
            aovLift > 0
              ? `+${formatCurrency(aovLift)} cross-sell lift`
              : "Ask for a product to unlock growth"
          }
          tone={aovLift > 0 ? "success" : "neutral"}
        />

        <ProofTile
          icon={LockKeyhole}
          label="Money gate"
          value={
            authorization
              ? authorization.decision
              : "Locked"
          }
          detail={
            authorization
              ? authorization.reason
              : "No payment action before policy checks"
          }
          tone={
            authorization?.decision === "AUTHORIZED"
              ? "success"
              : authorization?.decision === "BLOCKED"
              ? "danger"
              : authorization?.decision === "REVIEW"
              ? "review"
              : "neutral"
          }
        />

        <ProofTile
          icon={ReceiptText}
          label="Razorpay order"
          value={
            checkoutResult?.razorpay_order_id
              ? "Created"
              : "Pending"
          }
          detail={
            checkoutResult?.razorpay_order_id ||
            "Server creates order after signed intent"
          }
          tone={checkoutResult ? "success" : "neutral"}
        />

        <ProofTile
          icon={FileCheck2}
          label="Payment proof"
          value={
            paymentResult.status === "SUCCESS"
              ? "Completed"
              : paymentResult.status === "FAILED"
              ? "Stopped"
              : canPay
              ? "Ready"
              : "Not started"
          }
          detail={
            paymentResult.razorpay_payment_id ||
            paymentResult.message ||
            "Checkout popup opens only after order creation"
          }
          tone={
            paymentResult.status === "SUCCESS"
              ? "success"
              : paymentResult.status === "FAILED"
              ? "danger"
              : canPay
              ? "review"
              : "neutral"
          }
        />
      </div>

      <div className="agent-demo-card">
        <div className="agent-demo-title">
          <Target size={17} />
          <div>
            <span>JUDGE DEMO</span>
            <strong>Show the full Track 01 proof in this order</strong>
          </div>
        </div>

        <div className="agent-demo-grid">
          <DemoStep
            number="1"
            title="Growth"
            text="Ask: I need running shoes under 1500. Show product plus cross-sell and AOV lift."
          />
          <DemoStep
            number="2"
            title="Guardrail"
            text="Click Authorize. Show signed intent, backend amount, policy checks and confirmation gate."
          />
          <DemoStep
            number="3"
            title="Razorpay"
            text="Confirm, create a test-mode order, then open Razorpay Checkout from the UI."
          />
          <DemoStep
            number="4"
            title="Failure"
            text="Ask: I need a laptop under 40000. Show out-of-catalog stop and audit trail."
          />
        </div>
      </div>

      <div className="agent-layout">
        <section className="conversation-panel">
          <ChatPanel />
        </section>

        <aside className="agent-sidebar">
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
                    : "-"}
                </strong>
              </div>

              <div>
                <span>
                  Confidence
                </span>

                <strong>
                  {decision
                    ? `${decision.confidence}%`
                    : "-"}
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

          {currentRecommendation && (
            <div className="agent-recommendation-section">
              <RecommendationCard
                recommendation={{
                  productName:
                    currentRecommendation.product.name,
                  description:
                    currentRecommendation.product.description,
                  price:
                    currentRecommendation.product.price,
                  rating:
                    currentRecommendation.product.rating ||
                    4.7,
                  reviews:
                    currentRecommendation.product.reviewCount
                      ? `${currentRecommendation.product.reviewCount}`
                      : "catalog",
                  matchScore: Math.round(
                    currentRecommendation.matchScore
                  ),
                  reason:
                    currentRecommendation.reason,
                  expectedAOV:
                    cart?.total ||
                    currentRecommendation.product.price,
                  tag: "AI PICK",
                  crossSell:
                    agentResult?.cross_sell
                      ? {
                          name:
                            agentResult.cross_sell.product_name,
                          price:
                            agentResult.cross_sell.price,
                          reason:
                            "Bundled from backend product-affinity signals.",
                        }
                      : undefined,
                }}
              />
            </div>
          )}

          <AgentActivity />

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
                    status={guardrail.status}
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

          <div className="checkout-card">
            <div className="checkout-top">
              <div>
                <span>
                  CHECKOUT STATUS
                </span>

                <strong>
                  {checkoutResult
                    ? checkoutResult.status
                    : cart
                    ? formatCurrency(cart.total)
                    : "-"}
                </strong>
              </div>

              <CircleDollarSign size={23} />
            </div>

            <div className="checkout-progress">
              <CheckoutStep
                label="Authorized"
                active={
                  checkoutPhase ===
                    "authorized" ||
                  checkoutPhase === "order" ||
                  checkoutPhase ===
                    "payment" ||
                  checkoutPhase === "paid"
                }
              />
              <CheckoutStep
                label="Order"
                active={
                  checkoutPhase === "order" ||
                  checkoutPhase ===
                    "payment" ||
                  checkoutPhase === "paid"
                }
              />
              <CheckoutStep
                label="Payment"
                active={
                  checkoutPhase ===
                    "payment" ||
                  checkoutPhase === "paid"
                }
              />
              <CheckoutStep
                label="Proof"
                active={checkoutPhase === "paid"}
              />
            </div>

            {cart?.items?.length ? (
              <div className="checkout-items">
                {cart.items.map((item) => (
                  <div
                    key={item.productId}
                    className="checkout-item-row"
                  >
                    <span>
                      {item.productName}
                      {" x "}
                      {item.quantity}
                    </span>

                    <span>
                      {formatCurrency(
                        item.totalPrice
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="checkout-empty">
                Cart will appear here after the
                agent selects products.
              </div>
            )}

            {authorization && (
              <div className="checkout-empty">
                Authorization:{" "}
                {authorization.decision}
                {" - "}
                {authorization.reason}
              </div>
            )}

            <button
              className="checkout-button"
              disabled={
                (!canExecute && !canPay) ||
                isLoading ||
                !cart
              }
              onClick={handleCheckoutAction}
            >
              <CreditCard size={16} />

              {canPay
                ? "Pay with Razorpay"
                : canExecute
                ? "Create Razorpay order"
                : status ===
                  "PAYMENT_SUCCESS"
                ? "Payment completed"
                : status ===
                  "PAYMENT_FAILED"
                ? "Payment failed safely"
                : status ===
                  "AWAITING_CONFIRMATION"
                ? "Customer confirmation required"
                : status === "BLOCKED"
                ? "Blocked by policy"
                : status === "OUT_OF_CATALOG"
                ? "Out of catalog"
                : "Authorization required"}

              <ChevronRight size={16} />
            </button>

            <div className="checkout-action-note">
              {canPay
                ? "Opens Razorpay Checkout with the backend-created order ID."
                : canExecute
                ? "Creates an order only after signed intent and policy checks."
                : paymentResult.status ===
                  "SUCCESS"
                ? "Payment signature verified; backend checkout is paid."
                : "Payment remains locked until recommendation, authorization and confirmation are complete."}
            </div>

            {checkoutResult && (
              <div className="checkout-empty">
                {checkoutResult.message}
                {checkoutResult.razorpay_order_id ? (
                  <>
                    <br />
                    Order:{" "}
                    {checkoutResult.razorpay_order_id}
                  </>
                ) : null}
              </div>
            )}

            {paymentResult.status ===
              "SUCCESS" && (
              <div className="checkout-success">
                Payment ID:{" "}
                {paymentResult.razorpay_payment_id}
              </div>
            )}

            {error && (
              <div className="checkout-error">
                {error.message}
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="agent-audit-section">
        <AuditTrail />
      </div>
    </div>
  );
}

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
  const isPass = status === "PASS";
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

function DemoStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="agent-demo-step">
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function ProofTile({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: string;
  detail: string;
  tone:
    | "neutral"
    | "success"
    | "review"
    | "danger";
}) {
  return (
    <div className={`proof-tile ${tone}`}>
      <div className="proof-icon">
        <Icon size={15} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function CheckoutStep({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={
        active
          ? "checkout-step active"
          : "checkout-step"
      }
    >
      <span />
      {label}
    </div>
  );
}

function formatCurrency(amount: number) {
  return `INR ${amount.toLocaleString(
    "en-IN"
  )}`;
}

function formatAgentStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDecisionType(type: string) {
  return type
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

export default Agent;
