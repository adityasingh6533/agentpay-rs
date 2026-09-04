import {
  Bot,
  Check,
  Clock3,
  CreditCard,
  MessageSquare,
  Package,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useState,
} from "react";

import "../styles/ChatPanel.css";

import {
  useAgentContext,
} from "../context/AgentContext";

const demoPrompts = [
  {
    label: "Running bundle",
    prompt: "I need running shoes under 1500",
  },
  {
    label: "Yoga gear",
    prompt: "Find yoga gear under 1200",
  },
  {
    label: "Recovery kit",
    prompt: "Recommend recovery tools under 900",
  },
  {
    label: "Gym clothes",
    prompt: "I need gym clothes under 1500",
  },
  {
    label: "Confirmation gate",
    prompt: "I need a sports jacket under 2000",
  },
  {
    label: "Shorts",
    prompt: "Show me breathable sports shorts under 1000",
  },
  {
    label: "Socks",
    prompt: "Find running socks under 300",
  },
  {
    label: "Tee",
    prompt: "Recommend a performance tee under 800",
  },
  {
    label: "Out of catalog",
    prompt: "I need a laptop under 40000",
  },
];

function ChatPanel() {
  const {
    status,
    currentRecommendation,
    auditTrail,
    isLoading,
    error,
    canConfirm,
    needsReview,
    isBlocked,
    agentResult,
    authorization,
    checkoutResult,
    paymentResult,
    canPay,
    sendMessage,
    authorizeCheckout,
    confirmAction,
    executeCheckout,
    payWithRazorpay,
    loadAuditTrail,
    clearError,
  } = useAgentContext();

  const [message, setMessage] =
    useState("");
  const [
    submittedMessage,
    setSubmittedMessage,
  ] = useState("");
  const [hasStarted, setHasStarted] =
    useState(false);
  const [
    merchantId,
    setMerchantId,
  ] = useState(
    () =>
      process.env
        .REACT_APP_MERCHANT_ID ||
      "40000000-0000-0000-0000-000000000001"
  );

  useEffect(() => {
    if (hasStarted) {
      loadAuditTrail();
    }
  }, [
    status,
    hasStarted,
    loadAuditTrail,
  ]);

  const submitPrompt = async (
    prompt: string
  ) => {
    if (!prompt.trim() || isLoading) {
      return;
    }

    clearError();
    setHasStarted(true);
    setSubmittedMessage(prompt);
    setMessage("");

    await sendMessage(prompt);
  };

  const handleSubmit = async (
    event: FormEvent
  ) => {
    event.preventDefault();
    await submitPrompt(message.trim());
  };

  const handleAuthorize =
    async () => {
      if (!merchantId.trim()) {
        window.alert(
          "Merchant ID is required for checkout authorization."
        );
        return;
      }

      await authorizeCheckout(
        merchantId.trim()
      );
      await loadAuditTrail();
    };

  const handleConfirm =
    async () => {
      await confirmAction();
      await loadAuditTrail();
    };

  const handleExecute =
    async () => {
      await executeCheckout();
      await loadAuditTrail();
    };

  const handlePayment =
    async () => {
      await payWithRazorpay();
      await loadAuditTrail();
    };

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <div>
          <span className="chat-section-label">
            CUSTOMER SESSION
          </span>

          <div className="chat-session-title">
            <div className="chat-user-icon">
              <User size={16} />
            </div>

            <div>
              <strong>
                Agent Commerce Session
              </strong>

              <span>
                Ask, recommend, authorize,
                confirm, create order, pay
              </span>
            </div>
          </div>
        </div>

        <div className="chat-session-status">
          <span
            className={
              status === "FAILED" ||
              status === "BLOCKED" ||
              status === "OUT_OF_CATALOG"
                ? "status-dot danger"
                : "status-dot"
            }
          />
          {formatStatus(status)}
        </div>
      </div>

      <div className="chat-stage-strip">
        <Stage
          label="Ask"
          active={hasStarted}
        />
        <Stage
          label="Recommend"
          active={Boolean(agentResult)}
        />
        <Stage
          label="Authorize"
          active={Boolean(authorization)}
        />
        <Stage
          label="Confirm"
          active={
            status ===
              "AWAITING_CONFIRMATION" ||
            authorization?.decision ===
              "AUTHORIZED"
          }
        />
        <Stage
          label="Order"
          active={Boolean(checkoutResult)}
        />
        <Stage
          label="Pay"
          active={
            paymentResult.status ===
              "SUCCESS" ||
            status === "PAYMENT_PENDING"
          }
        />
      </div>

      <div className="chat-messages">
        {!hasStarted && (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">
              <Bot size={24} />
            </div>

            <strong>
              Start a judge-ready flow
            </strong>

            <p>
              Pick one request. The agent will
              search the backend catalog, choose a
              product, add a growth cross-sell when
              available, and wait for authorization
              before checkout.
            </p>

            <div className="chat-capabilities">
              <Capability
                icon={<Sparkles size={11} />}
                text="Catalog intelligence"
              />
              <Capability
                icon={<ShieldAlert size={11} />}
                text="Bounded money action"
              />
              <Capability
                icon={<Clock3 size={11} />}
                text="Visible audit trail"
              />
            </div>

            <div className="chat-demo-prompts">
              {demoPrompts.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    submitPrompt(item.prompt)
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasStarted && (
          <ChatBlock
            type="customer"
            label="CUSTOMER"
            icon={<User size={13} />}
          >
            {submittedMessage}
          </ChatBlock>
        )}

        {isLoading && (
          <ChatBlock
            type="agent"
            label="AGENTPAY AI"
            icon={<Bot size={13} />}
          >
            <div className="processing-dots">
              <span />
              <span />
              <span />
            </div>
            <strong>{formatStatus(status)}</strong>
          </ChatBlock>
        )}

        {!isLoading && agentResult && (
          <div className="chat-agent-result">
            <div className="chat-message-avatar agent">
              <Bot size={13} />
            </div>

            <div className="chat-agent-result-body">
              <span>AGENTPAY AI</span>

              <div className="chat-bubble agent">
                <strong>
                  Agent analysis complete
                </strong>

                <p>{agentResult.message}</p>

                <small>
                  Intent:{" "}
                  {agentResult.intent.category ||
                    "General"}{" "}
                  · confidence{" "}
                  {Math.round(
                    agentResult.intent.confidence *
                      100
                  )}
                  %
                </small>
              </div>

              {currentRecommendation && (
                <div className="chat-recommendation">
                  <div className="chat-recommendation-icon">
                    <Package size={14} />
                  </div>

                  <div className="chat-recommendation-info">
                    <span>
                      PRIMARY PRODUCT
                    </span>

                    <strong>
                      {
                        currentRecommendation
                          .product.name
                      }
                    </strong>

                    <p>
                      {
                        currentRecommendation.reason
                      }
                    </p>
                  </div>

                  <div className="chat-recommendation-score">
                    <strong>
                      {Math.round(
                        currentRecommendation.matchScore
                      )}
                      %
                    </strong>
                    <span>MATCH</span>
                  </div>
                </div>
              )}

              {agentResult.cross_sell && (
                <div className="chat-recommendation cross-sell">
                  <div className="chat-recommendation-icon">
                    <Sparkles size={14} />
                  </div>

                  <div className="chat-recommendation-info">
                    <span>
                      GROWTH CROSS-SELL
                    </span>

                    <strong>
                      {
                        agentResult.cross_sell
                          .product_name
                      }
                    </strong>

                    <p>
                      {formatCurrency(
                        agentResult.cross_sell.price
                      )}
                      {" · "}
                      {Math.round(
                        agentResult.cross_sell
                          .confidence * 100
                      )}
                      % affinity
                    </p>
                  </div>
                </div>
              )}

              {!authorization && currentRecommendation && (
                <div className="chat-confirmation">
                  <div>
                    <strong>
                      Authorization required
                    </strong>
                    <p>
                      Checkout is locked until the
                      backend policy and signed
                      intent checks pass.
                    </p>
                  </div>

                  <div className="chat-action-row">
                    <input
                      value={merchantId}
                      onChange={(event) =>
                        setMerchantId(
                          event.target.value
                        )
                      }
                      placeholder="Merchant ID"
                    />

                    <button
                      onClick={handleAuthorize}
                      disabled={
                        isLoading ||
                        !merchantId.trim()
                      }
                    >
                      <ShieldAlert size={13} />
                      Authorize
                    </button>
                  </div>
                </div>
              )}

              {authorization && (
                <div className="chat-policy">
                  <div className="chat-policy-title">
                    <ShieldAlert size={12} />
                    <span>
                      AUTHORIZATION RESULT
                    </span>
                  </div>

                  <div className="chat-policy-list">
                    <PolicyItem
                      label="Decision"
                      value={
                        authorization.decision
                      }
                    />
                    <PolicyItem
                      label="Amount"
                      value={formatCurrency(
                        authorization.amount
                      )}
                    />
                    <PolicyItem
                      label="Confirmation"
                      value={
                        authorization.requires_confirmation
                          ? "Required"
                          : "Not required"
                      }
                    />
                  </div>

                  <p className="chat-policy-reason">
                    {authorization.reason}
                  </p>
                </div>
              )}

              {canConfirm && (
                <ActionPanel
                  title="Customer confirmation required"
                  copy="The agent cannot execute payment until the customer approves this specific signed intent."
                  button="Confirm action"
                  icon={<Check size={13} />}
                  onClick={handleConfirm}
                  disabled={isLoading}
                />
              )}

              {authorization?.decision ===
                "AUTHORIZED" &&
                status === "AUTHORIZED" && (
                <ActionPanel
                  title="Ready to create Razorpay order"
                  copy="The backend has verified the signed intent. This button creates the test-mode Razorpay order."
                  button="Create Razorpay order"
                  icon={
                    <CreditCard size={13} />
                  }
                  onClick={handleExecute}
                  disabled={isLoading}
                />
              )}

              {checkoutResult && (
                <div className="chat-policy">
                  <div className="chat-policy-title">
                    <Check size={12} />
                    <span>
                      RAZORPAY ORDER CREATED
                    </span>
                  </div>

                  <div className="chat-policy-list">
                    <PolicyItem
                      label="Status"
                      value={
                        checkoutResult.status
                      }
                    />
                    <PolicyItem
                      label="Order"
                      value={
                        checkoutResult.razorpay_order_id ||
                        "Pending"
                      }
                    />
                  </div>

                  <p className="chat-policy-reason">
                    {checkoutResult.message}
                  </p>
                </div>
              )}

              {canPay && (
                <ActionPanel
                  title="Customer payment ready"
                  copy="The Razorpay order exists. Open the test-mode Checkout popup and complete payment with test details."
                  button="Pay with Razorpay"
                  icon={
                    <CreditCard size={13} />
                  }
                  onClick={handlePayment}
                  disabled={isLoading}
                />
              )}

              {paymentResult.status ===
                "SUCCESS" && (
                <div className="chat-policy">
                  <div className="chat-policy-title">
                    <Check size={12} />
                    <span>
                      PAYMENT COMPLETED
                    </span>
                  </div>

                  <div className="chat-policy-list">
                    <PolicyItem
                      label="Payment"
                      value={
                        paymentResult.razorpay_payment_id ||
                        "Captured"
                      }
                    />
                    <PolicyItem
                      label="Signature"
                      value={
                        paymentResult.razorpay_signature
                          ? "Received"
                          : "Pending"
                      }
                    />
                  </div>

                  <p className="chat-policy-reason">
                    {paymentResult.message}
                  </p>
                </div>
              )}

              {needsReview && (
                <StateNotice
                  tone="review"
                  title="Human review required"
                  copy="The policy engine requires review. No money has moved."
                />
              )}

              {status === "OUT_OF_CATALOG" && (
                <StateNotice
                  tone="blocked"
                  title="Out of catalog"
                  copy="The merchant does not sell a matching product, so the agent stopped before authorization or checkout."
                />
              )}

              {isBlocked && (
                <StateNotice
                  tone="blocked"
                  title="Action blocked"
                  copy="The backend refused the financial action. No payment should be executed."
                />
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="chat-error">
            <XCircle size={14} />

            <div>
              <strong>Agent error</strong>
              <p>{error.message}</p>
            </div>

            <button onClick={clearError}>
              <XCircle size={12} />
            </button>
          </div>
        )}

        {auditTrail.length > 0 && (
          <div className="chat-audit-summary">
            <Check size={11} />
            <span>
              {auditTrail.length} backend audit
              events recorded
            </span>
          </div>
        )}
      </div>

      <form
        className="chat-input"
        onSubmit={handleSubmit}
      >
        <MessageSquare size={16} />

        <input
          value={message}
          onChange={(event) =>
            setMessage(event.target.value)
          }
          placeholder={
            isLoading
              ? "Agent is processing..."
              : "Example: Find sports shorts under 1000"
          }
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={
            isLoading || !message.trim()
          }
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

function ChatBlock({
  type,
  label,
  icon,
  children,
}: {
  type: "agent" | "customer";
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`chat-message ${type}`}>
      <div
        className={`chat-message-avatar ${type}`}
      >
        {icon}
      </div>

      <div className="chat-message-body">
        <span>{label}</span>
        <div className={`chat-bubble ${type}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Capability({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <div className="chat-capability">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function Stage({
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
          ? "chat-stage active"
          : "chat-stage"
      }
    >
      <span />
      {label}
    </div>
  );
}

function PolicyItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="chat-policy-item">
      <Check size={10} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActionPanel({
  title,
  copy,
  button,
  icon,
  onClick,
  disabled,
}: {
  title: string;
  copy: string;
  button: string;
  icon: ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <div className="chat-confirmation">
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>

      <button
        onClick={onClick}
        disabled={disabled}
      >
        {icon}
        {button}
      </button>
    </div>
  );
}

function StateNotice({
  tone,
  title,
  copy,
}: {
  tone: "review" | "blocked";
  title: string;
  copy: string;
}) {
  return (
    <div
      className={
        tone === "review"
          ? "chat-review-state"
          : "chat-blocked-state"
      }
    >
      <ShieldAlert size={15} />
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>
    </div>
  );
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatCurrency(amount: number) {
  return `INR ${amount.toLocaleString(
    "en-IN"
  )}`;
}

export default ChatPanel;
