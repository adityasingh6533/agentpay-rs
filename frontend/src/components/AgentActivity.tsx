import {
  Check,
  CircleAlert,
  CreditCard,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  XCircle,
} from "lucide-react";

import "../styles/AgentActivity.css";

import {
  type ElementType,
} from "react";

import {
  useAgentContext,
} from "../context/AgentContext";

type ActivityStatus =
  | "WAITING"
  | "ACTIVE"
  | "DONE"
  | "REVIEW"
  | "BLOCKED";

type Activity = {
  id: string;
  title: string;
  description: string;
  icon: ElementType;
  status: ActivityStatus;
};

function AgentActivity() {
  const {
    status,
    intent,
    decision,
    authorization,
    checkoutResult,
    paymentResult,
  } = useAgentContext();

  const activities: Activity[] = [
    {
      id: "intent",

      title:
        "Understanding customer intent",

      description:
        intent
          ? "Customer intent successfully extracted."
          : "Waiting for customer request.",

      icon: UserCheck,

      status:
        getStageStatus(
          status,
          "UNDERSTANDING"
        ),
    },

    {
      id: "catalog",

      title:
        "Searching product catalog",

      description:
        decision
          ? "Relevant products identified from the merchant catalog."
          : status === "OUT_OF_CATALOG"
          ? "No matching product exists in this merchant catalog."
          : "Agent will search available products after understanding intent.",

      icon: Search,

      status:
        getStageStatus(
          status,
          "SEARCHING"
        ),
    },

    {
      id: "decision",

      title:
        "Generating agent decision",

      description:
        decision
          ? "Recommendation and purchase strategy generated."
          : "Waiting for recommendation engine.",

      icon: Sparkles,

      status:
        getStageStatus(
          status,
          "DECIDING"
        ),
    },

    {
      id: "guardrails",

      title:
        "Evaluating action guardrails",

      description:
        decision
          ? `${decision.guardrails.length} policy checks evaluated.`
          : "Spending, inventory and authorization policies will be checked.",

      icon: ShieldCheck,

      status:
        getGuardrailStatus(
          status,
          decision
        ),
    },

    {
      id: "authorization",

      title:
        "Customer authorization",

      description:
        status === "AUTHORIZED"
          || status ===
            "PAYMENT_PENDING"
          || status ===
            "PAYMENT_SUCCESS"
          || status ===
            "PAYMENT_FAILED"
          ? "Customer action has been authorized."
          : authorization?.decision ===
            "REVIEW"
          ? "Explicit customer confirmation is required."
          : status ===
            "AWAITING_CONFIRMATION"
          ? "Waiting for explicit customer confirmation."
          : "No financial action can execute without authorization.",

      icon: UserCheck,

      status:
        status === "AUTHORIZED" ||
        status === "PAYMENT_PENDING" ||
        status === "PAYMENT_SUCCESS" ||
        status === "PAYMENT_FAILED"
          ? "DONE"
          : authorization?.decision ===
            "REVIEW"
          ? "REVIEW"
          : status ===
            "AWAITING_CONFIRMATION"
          ? "ACTIVE"
          : status === "BLOCKED"
          ? "BLOCKED"
          : "WAITING",
    },

    {
      id: "checkout",

      title:
        "Secure checkout",

      description:
        status === "PAYMENT_SUCCESS"
          ? "Customer completed Razorpay Checkout; backend verified signature and marked checkout paid."
          : status ===
            "PAYMENT_FAILED"
          ? paymentResult.message ||
            "Payment failed safely before final capture."
          : checkoutResult
          ? "Razorpay order created; waiting for customer payment."
          : status === "OUT_OF_CATALOG"
          ? "Checkout stayed locked because the item is not sold here."
          : status === "FAILED"
          ? "Checkout failed safely and the audit trail records why."
          : "Checkout remains locked until authorization is complete.",

      icon: CreditCard,

      status:
        status === "CHECKOUT" ||
        status === "PAYMENT_PENDING"
          ? "ACTIVE"
          : status ===
            "PAYMENT_SUCCESS"
          || status === "COMPLETED"
          ? "DONE"
          : status ===
            "PAYMENT_FAILED"
          ? "BLOCKED"
          : status === "BLOCKED"
          ? "BLOCKED"
          : "WAITING",
    },
  ];

  return (
    <div className="agent-card activity-card">

      {/* HEADER */}

      <div className="card-title-row">

        <div>

          <span>
            AGENT ACTIVITY
          </span>

          <strong>
            Decision pipeline
          </strong>

        </div>

        <span
          className={
        status === "BLOCKED" ||
            status === "FAILED" ||
            status === "OUT_OF_CATALOG"
              ? "live-small danger"
              : "live-small"
          }
        >
          {status === "IDLE"
            ? "READY"
            : "LIVE"}
        </span>

      </div>

      {/* PIPELINE */}

      <div className="activity-list">

        {activities.map(
          (activity, index) => (
            <ActivityRow
              key={
                activity.id
              }
              activity={
                activity
              }
              isLast={
                index ===
                activities.length - 1
              }
            />
          )
        )}

      </div>

      {/* CURRENT STATE */}

      <div
        className={`activity-current-state ${getStateClass(
          status
        )}`}
      >

        <span className="state-dot" />

        <div>

          <span>
            CURRENT AGENT STATE
          </span>

          <strong>
            {formatStatus(
              status
            )}
          </strong>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   ROW
   ========================================================= */

function ActivityRow({
  activity,
  isLast,
}: {
  activity: Activity;
  isLast: boolean;
}) {
  const Icon =
    activity.icon;

  return (
    <div className="activity">

      <div className="activity-line">

        <div
          className={`activity-icon ${activity.status.toLowerCase()}`}
        >

          {activity.status ===
          "DONE" ? (
            <Check size={11} />
          ) : activity.status ===
            "BLOCKED" ? (
            <XCircle size={11} />
          ) : activity.status ===
            "REVIEW" ? (
            <CircleAlert size={11} />
          ) : (
            <Icon size={12} />
          )}

        </div>

        {!isLast && (
          <div
            className={`activity-connector ${
              activity.status ===
              "DONE"
                ? "completed"
                : ""
            }`}
          />
        )}

      </div>

      <div className="activity-content">

        <div className="activity-title-row">

          <strong>
            {activity.title}
          </strong>

          <ActivityBadge
            status={
              activity.status
            }
          />

        </div>

        <p>
          {activity.description}
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   BADGE
   ========================================================= */

function ActivityBadge({
  status,
}: {
  status: ActivityStatus;
}) {
  if (status === "DONE") {
    return (
      <span className="activity-badge done">
        COMPLETE
      </span>
    );
  }

  if (status === "ACTIVE") {
    return (
      <span className="activity-badge active">
        RUNNING
      </span>
    );
  }

  if (status === "REVIEW") {
    return (
      <span className="activity-badge review">
        REVIEW
      </span>
    );
  }

  if (status === "BLOCKED") {
    return (
      <span className="activity-badge blocked">
        BLOCKED
      </span>
    );
  }

  return (
    <span className="activity-badge waiting">
      WAITING
    </span>
  );
}

/* =========================================================
   STAGE STATUS
   ========================================================= */

function getStageStatus(
  current: string,
  stage: string
): ActivityStatus {
  const order = [
    "UNDERSTANDING",
    "SEARCHING",
    "OUT_OF_CATALOG",
    "DECIDING",
    "READY_FOR_AUTHORIZATION",
    "GUARDRAIL_CHECK",
    "AWAITING_CONFIRMATION",
    "AUTHORIZED",
    "CHECKOUT",
    "PAYMENT_PENDING",
    "PAYMENT_SUCCESS",
    "PAYMENT_FAILED",
    "COMPLETED",
  ];

  const currentIndex =
    order.indexOf(current);

  const stageIndex =
    order.indexOf(stage);

  if (current === "IDLE") {
    return "WAITING";
  }

  if (current === "FAILED") {
    return "BLOCKED";
  }

  if (current === "OUT_OF_CATALOG") {
    if (stage === "UNDERSTANDING") {
      return "DONE";
    }

    if (stage === "SEARCHING") {
      return "BLOCKED";
    }

    return "WAITING";
  }

  if (
    current ===
    "REVIEW_REQUIRED"
  ) {
    return stageIndex <= 3
      ? "DONE"
      : "REVIEW";
  }

  if (current === "BLOCKED") {
    return stageIndex <= 3
      ? "DONE"
      : "BLOCKED";
  }

  if (
    currentIndex >
    stageIndex
  ) {
    return "DONE";
  }

  if (
    currentIndex ===
    stageIndex
  ) {
    return "ACTIVE";
  }

  return "WAITING";
}

/* =========================================================
   GUARDRAIL STATUS
   ========================================================= */

function getGuardrailStatus(
  status: string,
  decision: any
): ActivityStatus {
  if (!decision) {
    return "WAITING";
  }

  if (status === "BLOCKED") {
    return "BLOCKED";
  }

  if (
    status ===
    "REVIEW_REQUIRED"
  ) {
    return "REVIEW";
  }

  if (
    status ===
      "AWAITING_CONFIRMATION" ||
    status === "AUTHORIZED" ||
    status === "CHECKOUT" ||
    status === "PAYMENT_PENDING" ||
    status === "PAYMENT_SUCCESS" ||
    status === "PAYMENT_FAILED" ||
    status === "COMPLETED"
  ) {
    return "DONE";
  }

  if (
    status ===
    "READY_FOR_AUTHORIZATION"
  ) {
    return "ACTIVE";
  }

  if (
    status ===
    "GUARDRAIL_CHECK"
  ) {
    return "ACTIVE";
  }

  return "WAITING";
}

/* =========================================================
   CURRENT STATE
   ========================================================= */

function getStateClass(
  status: string
) {
  if (status === "BLOCKED") {
    return "danger";
  }

  if (
    status ===
      "REVIEW_REQUIRED" ||
    status === "OUT_OF_CATALOG"
  ) {
    return "review";
  }

  if (
    status === "COMPLETED" ||
    status === "PAYMENT_SUCCESS"
  ) {
    return "success";
  }

  return "active";
}

/* =========================================================
   FORMAT
   ========================================================= */

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

export default AgentActivity;
