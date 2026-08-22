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
    decision,
    currentRecommendation,
    auditTrail,
    isLoading,
    error,

    canConfirm,
    needsReview,
    isBlocked,

    sendMessage,
    confirmAction,
    loadAuditTrail,
    clearError,
  } = useAgentContext();

  const [message, setMessage] =
    useState("");

  const [hasStarted, setHasStarted] =
    useState(false);

  useEffect(() => {
    if (hasStarted) {
      loadAuditTrail();
    }
  }, [
    status,
    hasStarted,
    loadAuditTrail,
  ]);

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
    setMessage("");

    await sendMessage(trimmed);
  };

  const handleConfirm =
    async () => {
      await confirmAction();
      await loadAuditTrail();
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

          {formatStatus(status)}

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
              wants. It will search the catalog,
              reason over the request and evaluate
              policy before proposing an action.
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
                Customer request submitted
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
                  {formatStatus(status)}
                </strong>

              </div>

            </div>

          </div>
        )}

        {!isLoading &&
          decision && (
            <div className="chat-agent-result">

              <div className="chat-message-avatar agent">
                <Bot size={13} />
              </div>

              <div className="chat-agent-result-body">

                <span>
                  AGENTPAY AI
                </span>

                <div className="chat-bubble agent">

                  <strong>
                    Agent decision ready.
                  </strong>

                  <p>
                    {decision.reasoning}
                  </p>

                </div>

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
                            .product.name
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
                        {
                          currentRecommendation
                            .matchScore
                        }%
                      </strong>

                      <span>
                        MATCH
                      </span>

                    </div>

                  </div>
                )}

                {/* POLICY */}

                <div className="chat-policy">

                  <div className="chat-policy-title">

                    <ShieldAlert size={12} />

                    <span>
                      POLICY CHECK
                    </span>

                  </div>

                  <div className="chat-policy-list">

                    {decision.guardrails.map(
                      (guardrail) => (
                        <div
                          key={
                            guardrail.id
                          }
                          className={`chat-policy-item ${guardrail.status.toLowerCase()}`}
                        >

                          {guardrail.status ===
                          "PASS" ? (
                            <Check size={10} />
                          ) : (
                            <XCircle size={10} />
                          )}

                          <span>
                            {guardrail.name}
                          </span>

                          <strong>
                            {
                              guardrail.status
                            }
                          </strong>

                        </div>
                      )
                    )}

                  </div>

                </div>

                {/* CONFIRMATION */}

                {canConfirm && (
                  <div className="chat-confirmation">

                    <div>

                      <strong>
                        Customer confirmation required
                      </strong>

                      <p>
                        The agent cannot authorize
                        the transaction without explicit
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

                {/* REVIEW */}

                {needsReview && (
                  <div className="chat-review-state">

                    <ShieldAlert size={15} />

                    <div>

                      <strong>
                        Human review required
                      </strong>

                      <p>
                        The agent detected a policy
                        condition that requires review.
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
                        The agent refused to execute
                        the action because a guardrail
                        was violated.
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
          disabled={isLoading}
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

function formatStatus(
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

export default ChatPanel;