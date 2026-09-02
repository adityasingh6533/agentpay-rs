import {
  AlertTriangle,
  Bot,
  Check,
  ChevronRight,
  CreditCard,
  Lock,
  SearchX,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

import "../styles/Guardrails.css";
import api from "../services/api";
import type { SpendingLimits } from "../types";

const merchantId =
  process.env.REACT_APP_MERCHANT_ID ||
  "40000000-0000-0000-0000-000000000001";

function Guardrails() {
  const navigate = useNavigate();
  const [policy, setPolicy] =
    useState<SpendingLimits | null>(null);
  const [loadError, setLoadError] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    api.policy
      .get(merchantId)
      .then((data) => {
        if (mounted) {
          setPolicy(data);
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (mounted) {
          setPolicy(null);
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load merchant policy."
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="guardrails-page">
      <div className="guardrails-header">
        <div>
          <div className="guardrails-eyebrow">
            SAFETY CONTROL CENTER
          </div>

          <h1>Policy, failures and audit proof</h1>

          <p>
            Every money action is bounded, explainable and
            customer-gated before Razorpay order creation.
          </p>
        </div>

        <button
          className="guardrails-primary"
          onClick={() => navigate("/agent")}
        >
          Run judge demo
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="guardrails-grid">
        <section className="guardrails-card policy-card">
          <CardTitle
            icon={<ShieldCheck size={18} />}
            label="MERCHANT POLICY"
            title="Active spending limits"
          />

          {policy ? (
            <div className="policy-metrics">
              <PolicyMetric
                label="Max transaction"
                value={formatCurrency(
                  policy.maxTransactionAmount
                )}
              />
              <PolicyMetric
                label="Daily customer cap"
                value={formatCurrency(policy.dailyLimit)}
              />
              <PolicyMetric
                label="Confirmation above"
                value={formatCurrency(
                  policy.requiresConfirmationAbove
                )}
              />
              <PolicyMetric
                label="Currency"
                value={policy.currency}
              />
            </div>
          ) : (
            <div className="guardrails-empty">
              <AlertTriangle size={16} />
              {loadError || "Loading policy..."}
            </div>
          )}

          <div className="allowed-categories">
            <span>Allowed categories</span>
            <div>
              {(policy?.allowedCategories ?? []).map(
                (category) => (
                  <strong key={category}>
                    {category}
                  </strong>
                )
              )}
            </div>
          </div>
        </section>

        <section className="guardrails-card">
          <CardTitle
            icon={<Lock size={18} />}
            label="MONEY ACTION FLOW"
            title="Checkout cannot skip gates"
          />

          <div className="gate-list">
            <Gate
              icon={<Bot size={14} />}
              title="Intent extraction"
              text="Agent identifies category, budget and customer request."
            />
            <Gate
              icon={<SearchX size={14} />}
              title="Catalog relevance"
              text="Unknown items stop as out-of-catalog, not random recommendations."
            />
            <Gate
              icon={<ShieldCheck size={14} />}
              title="Policy authorization"
              text="Backend recalculates price and checks category, amount and daily cap."
            />
            <Gate
              icon={<CreditCard size={14} />}
              title="Razorpay execution"
              text="Order creation happens only after signed intent and confirmation pass."
            />
          </div>
        </section>
      </div>

      <section className="guardrails-card failure-card">
        <CardTitle
          icon={<AlertTriangle size={18} />}
          label="FAILURE DEMO CENTER"
          title="Show graceful failure, not crashes"
        />

        <div className="failure-grid">
          <FailureDemo
            title="Out of catalog"
            prompt="I need a mobile phone under 2000"
            result="Agent refuses checkout because the merchant does not sell phones."
            onRun={() => navigate("/agent")}
          />
          <FailureDemo
            title="Budget or policy cap"
            prompt="I need a sports jacket above the confirmation limit"
            result="Policy moves the action to review instead of silent execution."
            onRun={() => navigate("/agent")}
          />
          <FailureDemo
            title="Missing confirmation"
            prompt="Create order before confirming"
            result="Backend blocks execution until the customer confirmation token is consumed."
            onRun={() => navigate("/agent")}
          />
          <FailureDemo
            title="Payment failure recovery"
            prompt="Webhook payment.failed"
            result="Tests prove reserved inventory is released and intent returns to authorized."
            onRun={() => navigate("/transactions")}
          />
        </div>
      </section>

      <section className="guardrails-proof">
        <ProofItem
          icon={<Check size={14} />}
          title="Explainable"
          text="Decision reasons, policy result and authorization status are visible."
        />
        <ProofItem
          icon={<Check size={14} />}
          title="Bounded"
          text="Amount and category are checked on the backend, not trusted from frontend."
        />
        <ProofItem
          icon={<Check size={14} />}
          title="Gated"
          text="Customer confirmation is required before review-sized checkout execution."
        />
        <ProofItem
          icon={<Sparkles size={14} />}
          title="Growth"
          text="Cross-sell bundles increase cart value while staying policy-safe."
        />
      </section>
    </div>
  );
}

function CardTitle({
  icon,
  label,
  title,
}: {
  icon: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <div className="guardrails-card-title">
      <div>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{title}</strong>
      </div>
    </div>
  );
}

function PolicyMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="policy-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Gate({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="gate-item">
      <div>{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function FailureDemo({
  title,
  prompt,
  result,
  onRun,
}: {
  title: string;
  prompt: string;
  result: string;
  onRun: () => void;
}) {
  return (
    <div className="failure-demo">
      <span>{title}</span>
      <strong>{prompt}</strong>
      <p>{result}</p>
      <button onClick={onRun}>
        Open flow
        <ChevronRight size={12} />
      </button>
    </div>
  );
}

function ProofItem({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="proof-item">
      <div>{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function formatCurrency(amount: number) {
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

export default Guardrails;
