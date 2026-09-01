import {
  Bot,
  Check,
  Clock3,
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import "../styles/ChatPanel.css";

import {
  useAgentContext,
} from "../context/AgentContext";

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

    sendMessage,
    authorizeCheckout,
    confirmAction,
    executeCheckout,

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

  /* =========================================================
     SEND MESSAGE
     ========================================================= */

  const handleSubmit = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    const trimmed =
      message.trim();

    if (
      !trimmed ||
      isLoading
    ) {
      return;
    }

    clearError();

    setHasStarted(true);
    setSubmittedMessage(trimmed);
    setMessage("");

    await sendMessage(
      trimmed
    );
  };

  /* =========================================================
     AUTHORIZE
     ========================================================= */

  const handleAuthorize =
    async () => {
      if (!merchantId.trim()) {
        clearError();

        /*
         * We deliberately don't invent
         * a merchant UUID.
         */
        window.alert(
          "Merchant ID is required for secure checkout authorization."
        );

        return;
      }

      await authorizeCheckout(
        merchantId.trim()
      );

      await loadAuditTrail();
    };

  /* =========================================================
     CONFIRM
     ========================================================= */

  const handleConfirm =
    async () => {
      await confirmAction();

      await loadAuditTrail();
    };

  /* =========================================================
     EXECUTE
     ========================================================= */

  const handleExecute =
    async () => {
      await executeCheckout();

      await loadAuditTrail();
    };

  const runPrompt = async (
    prompt: string
  ) => {
    if (isLoading) {
      return;
    }

    clearError();
    setHasStarted(true);
    setSubmittedMessage(prompt);
    setMessage("");

    await sendMessage(prompt);
  };

  return (
    <div className="chat-panel">

      {/* HEADER */}

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
                Autonomous shopping assistant
              </span>

            </div>

          </div>

        </div>

        <div className="chat-session-status">

          <span
            className={
              status === "FAILED" ||
              status === "BLOCKED"
                ? "status-dot danger"
                : "status-dot"
            }
          />

          {formatStatus(
            status
          )}

        </div>

      </div>

      {/* MESSAGES */}

      <div className="chat-messages">

        {!hasStarted && (
          <div className="chat-empty-state">

            <div className="chat-empty-icon">
              <Bot size={24} />
            </div>

            <strong>
              AgentPay Commerce Agent
            </strong>

            <p>
              Tell the agent what the customer
              wants. It will understand the request,
              search the merchant catalog and return
              a recommendation before any financial
              action is attempted.
            </p>

            <div className="chat-capabilities">

              <Capability
                icon={
                  <Sparkles size={11} />
                }
                text="Intent understanding"
              />

              <Capability
                icon={
                  <ShieldAlert size={11} />
                }
                text="Policy enforcement"
              />

              <Capability
                icon={
                  <Clock3 size={11} />
                }
                text="Auditable decisions"
              />

            </div>

            <div className="chat-demo-prompts">
              <button
                type="button"
                onClick={() =>
                  runPrompt(
                    "I need running shoes under 1500"
                  )
                }
              >
                Running bundle
              </button>

              <button
                type="button"
                onClick={() =>
                  runPrompt(
                    "I need a sports jacket under 2000"
                  )
                }
              >
                Confirmation gate
              </button>
            </div>

          </div>
        )}

        {hasStarted && (
          <div className="chat-message customer">

            <div className="chat-message-avatar customer">
              <User size={13} />
            </div>

            <div className="chat-message-body">

              <span>
                CUSTOMER
              </span>

              <div className="chat-bubble customer">
                {submittedMessage ||
                  "Customer request submitted"}
              </div>

            </div>

          </div>
        )}

        {isLoading && (
          <div className="chat-message agent">

            <div className="chat-message-avatar agent">
              <Bot size={13} />
            </div>

            <div className="chat-message-body">

              <span>
                AGENTPAY AI
              </span>

              <div className="chat-bubble agent processing">

                <div className="processing-dots">
                  <span />
                  <span />
                  <span />
                </div>

                <strong>
                  {formatStatus(
                    status
                  )}
                </strong>

              </div>

            </div>

          </div>
        )}

        {!isLoading &&
          agentResult && (
            <div className="chat-agent-result">

              <div className="chat-message-avatar agent">
                <Bot size={13} />
              </div>

              <div className="chat-agent-result-body">

                <span>
                  AGENTPAY AI
                </span>

                {/* AGENT RESPONSE */}

                <div className="chat-bubble agent">

                  <strong>
                    Agent analysis complete.
                  </strong>

                  <p>
                    {agentResult.message}
                  </p>

                  <small>
                    Intent confidence:{" "}
                    {Math.round(
                      agentResult.intent
                        .confidence *
                        100
                    )}
                    %
                  </small>

                </div>

                {/* RECOMMENDATION */}

                {currentRecommendation && (
                  <div className="chat-recommendation">

                    <div className="chat-recommendation-icon">
                      <Sparkles size={14} />
                    </div>

                    <div className="chat-recommendation-info">

                      <span>
                        AI RECOMMENDATION
                      </span>

                      <strong>
                        {
                          currentRecommendation
                            .product
                            .name
                        }
                      </strong>

                      <p>
                        {
                          currentRecommendation
                            .reason
                        }
                      </p>

                    </div>

                    <div className="chat-recommendation-score">

                      <strong>
                        {Math.round(
                          currentRecommendation
                            .matchScore
                        )}
                        %
                      </strong>

                      <span>
                        MATCH
                      </span>

                    </div>

                  </div>
                )}

                {/* CROSS SELL */}

                {agentResult.cross_sell && (
                  <div className="chat-recommendation">

                    <div className="chat-recommendation-icon">
                      <Sparkles size={14} />
                    </div>

                    <div className="chat-recommendation-info">

                      <span>
                        AI CROSS-SELL
                      </span>

                      <strong>
                        {
                          agentResult
                            .cross_sell
                            .product_name
                        }
                      </strong>

                      <p>
                        ₹
                        {
                          agentResult
                            .cross_sell
                            .price
                        }
                        {" · "}
                        {Math.round(
                          agentResult
                            .cross_sell
                            .confidence *
                            100
                        )}
                        % confidence
                      </p>

                    </div>

                  </div>
                )}

                {/* MERCHANT ID */}

                {agentResult &&
                  !authorization && (
                    <div className="chat-confirmation">

                      <div>

                        <strong>
                          Secure checkout authorization
                        </strong>

                        <p>
                          The agent recommendation is
                          not a payment authorization.
                          Enter the merchant ID to run
                          the backend policy and signed
                          intent checks.
                        </p>

                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "8px",
                          width:
                            "100%",
                        }}
                      >

                        <input
                          value={
                            merchantId
                          }
                          onChange={(
                            event
                          ) =>
                            setMerchantId(
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Merchant ID"
                        />

                        <button
                          onClick={
                            handleAuthorize
                          }
                          disabled={
                            isLoading ||
                            !merchantId.trim()
                          }
                        >
                          <ShieldAlert
                            size={13}
                          />

                          Authorize
                        </button>

                      </div>

                    </div>
                  )}

                {/* AUTHORIZATION RESULT */}

                {authorization && (
                  <div className="chat-policy">

                    <div className="chat-policy-title">

                      <ShieldAlert size={12} />

                      <span>
                        AUTHORIZATION RESULT
                      </span>

                    </div>

                    <div className="chat-policy-list">

                      <div className="chat-policy-item">

                        <Check size={10} />

                        <span>
                          Decision
                        </span>

                        <strong>
                          {
                            authorization
                              .decision
                          }
                        </strong>

                      </div>

                      <div className="chat-policy-item">

                        <Check size={10} />

                        <span>
                          Intent
                        </span>

                        <strong>
                          {
                            authorization
                              .intent_id
                          }
                        </strong>

                      </div>

                    </div>

                    <p
                      style={{
                        marginTop:
                          "8px",
                      }}
                    >
                      {
                        authorization.reason
                      }
                    </p>

                  </div>
                )}

                {/* CONFIRMATION */}

                {canConfirm && (
                  <div className="chat-confirmation">

                    <div>

                      <strong>
                        Customer confirmation required
                      </strong>

                      <p>
                        The agent cannot proceed
                        without explicit customer
                        confirmation.
                      </p>

                    </div>

                    <button
                      onClick={
                        handleConfirm
                      }
                      disabled={
                        isLoading
                      }
                    >

                      <Check size={13} />

                      Confirm action

                    </button>

                  </div>
                )}

                {/* EXECUTION */}

                {authorization?.decision ===
                  "AUTHORIZED" &&
                  status ===
                    "AUTHORIZED" && (
                    <div className="chat-confirmation">

                      <div>

                        <strong>
                          Authorization verified
                        </strong>

                        <p>
                          The signed intent has
                          passed the authorization
                          boundary. Execute only after
                          confirmation requirements
                          are satisfied.
                        </p>

                      </div>

                      <button
                        onClick={
                          handleExecute
                        }
                        disabled={
                          isLoading
                        }
                      >

                        <Check size={13} />

                        Create Razorpay Order

                      </button>

                    </div>
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

                      <div className="chat-policy-item">

                        <Check size={10} />

                        <span>
                          Status
                        </span>

                        <strong>
                          {
                            checkoutResult
                              .status
                          }
                        </strong>

                      </div>

                      <div className="chat-policy-item">

                        <Check size={10} />

                        <span>
                          Order
                        </span>

                        <strong>
                          {
                            checkoutResult
                              .razorpay_order_id ||
                            "Pending"
                          }
                        </strong>

                      </div>

                    </div>

                    <p
                      style={{
                        marginTop:
                          "8px",
                      }}
                    >
                      {
                        checkoutResult.message
                      }
                    </p>

                  </div>
                )}

                {/* REVIEW */}

                {needsReview && (
                  <div className="chat-review-state">

                    <ShieldAlert size={15} />

                    <div>

                      <strong>
                        Human review required
                      </strong>

                      <p>
                        The policy engine detected
                        a condition requiring review.
                        No transaction has been executed.
                      </p>

                    </div>

                  </div>
                )}

                {/* BLOCKED */}

                {isBlocked && (
                  <div className="chat-blocked-state">

                    <XCircle size={15} />

                    <div>

                      <strong>
                        Action blocked
                      </strong>

                      <p>
                        The backend policy engine
                        refused the financial action.
                        No payment should be executed.
                      </p>

                    </div>

                  </div>
                )}

              </div>

            </div>
          )}

        {/* ERROR */}

        {error && (
          <div className="chat-error">

            <XCircle size={14} />

            <div>

              <strong>
                Agent error
              </strong>

              <p>
                {error.message}
              </p>

            </div>

            <button
              onClick={
                clearError
              }
            >
              <XCircle size={12} />
            </button>

          </div>
        )}

        {auditTrail.length > 0 && (
          <div className="chat-audit-summary">

            <Check size={11} />

            <span>
              {auditTrail.length} auditable
              agent events recorded
            </span>

          </div>
        )}

      </div>

      {/* INPUT */}

      <form
        className="chat-input"
        onSubmit={
          handleSubmit
        }
      >

        <MessageSquare size={16} />

        <input
          value={message}
          onChange={(event) =>
            setMessage(
              event.target.value
            )
          }
          placeholder={
            isLoading
              ? "Agent is processing..."
              : "Tell the agent what the customer needs..."
          }
          disabled={
            isLoading
          }
        />

        <button
          type="submit"
          disabled={
            isLoading ||
            !message.trim()
          }
        >
          <Send size={15} />
        </button>

      </form>

    </div>
  );
}

/* =========================================================
   CAPABILITY
   ========================================================= */

function Capability({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="chat-capability">

      {icon}

      <span>
        {text}
      </span>

    </div>
  );
}

/* =========================================================
   STATUS
   ========================================================= */

function formatStatus(
  status: string
) {
  return status
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

export default ChatPanel;
