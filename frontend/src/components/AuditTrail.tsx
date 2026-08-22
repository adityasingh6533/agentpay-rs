import {
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  Database,
  ExternalLink,
  FileCheck2,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  CreditCard,
  XCircle,
} from "lucide-react";

import "../styles/AuditTrail.css";

import {
  useAgentContext,
} from "../context/AgentContext";

import type {
  AuditEvent as AgentAuditEvent,
} from "../types";

type AuditStatus =
  | "success"
  | "pending"
  | "review"
  | "failed";

type AuditEventView = {
  time: string;
  type: string;
  title: string;
  description: string;
  tool?: string;
  status: AuditStatus;
  icon: any;
};

const fallbackAuditEvents: AuditEventView[] = [
  {
    time: "10:42:18.102",
    type: "INTENT",
    title: "Customer intent received",
    description:
      "Customer requested running shoes under ₹1500.",
    tool: "customer_context",
    status: "success",
    icon: Bot,
  },
  {
    time: "10:42:18.421",
    type: "CATALOG",
    title: "Product catalog queried",
    description:
      "Agent searched 248 products using price and category constraints.",
    tool: "catalog.search",
    status: "success",
    icon: Search,
  },
  {
    time: "10:42:19.018",
    type: "DECISION",
    title: "Recommendation generated",
    description:
      "Velocity Running Shoes selected as the highest-confidence match.",
    tool: "agent.decision",
    status: "success",
    icon: Sparkles,
  },
  {
    time: "10:42:19.447",
    type: "GROWTH",
    title: "Cross-sell opportunity detected",
    description:
      "Running Socks identified using product-affinity signals.",
    tool: "growth.recommend",
    status: "success",
    icon: TrendingUp,
  },
  {
    time: "10:42:20.201",
    type: "POLICY",
    title: "Merchant policy validated",
    description:
      "Bundle discount validated against merchant constraints.",
    tool: "policy.validate",
    status: "success",
    icon: ShieldCheck,
  },
  {
    time: "10:42:21.003",
    type: "CHECKOUT",
    title: "Razorpay order created",
    description:
      "Payment order prepared for ₹1398.",
    tool: "razorpay.create_order",
    status: "success",
    icon: CreditCard,
  },
  {
    time: "10:42:21.581",
    type: "WEBHOOK",
    title: "Payment verification",
    description:
      "Waiting for verified Razorpay payment webhook.",
    tool: "razorpay.webhook",
    status: "pending",
    icon: FileCheck2,
  },
];

function AuditTrail() {
  const {
    auditTrail,
    status,
  } = useAgentContext();

  const events =
    auditTrail.length > 0
      ? auditTrail.map(
          mapAuditEvent
        )
      : fallbackAuditEvents;

  const toolCount =
    new Set(
      events
        .map((event) => event.tool)
        .filter(Boolean)
    ).size;

  const decisionCount =
    events.filter((event) =>
      [
        "DECISION",
        "GROWTH",
        "POLICY",
        "CHECKOUT",
      ].includes(event.type)
    ).length;

  return (
    <div className="audit-trail-card">
      {/* HEADER */}

      <div className="audit-header">
        <div className="audit-heading">
          <div className="audit-main-icon">
            <Database size={17} />
          </div>

          <div>
            <span>AUDIT TRAIL</span>
            <strong>Agent decision history</strong>
          </div>
        </div>

        <div className="audit-header-actions">
          <span className="audit-secure">
            <Lock size={10} />
            IMMUTABLE
          </span>

          <button>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="audit-summary">
        <AuditStat
          label="TOTAL EVENTS"
          value={`${events.length}`}
        />

        <AuditStat
          label="TOOLS CALLED"
          value={`${toolCount}`}
        />

        <AuditStat
          label="DECISIONS"
          value={`${decisionCount}`}
        />

        <AuditStat
          label="STATUS"
          value={formatStatus(status)}
          green={
            status !== "FAILED" &&
            status !== "BLOCKED"
          }
        />
      </div>

      {/* TIMELINE */}

      <div className="audit-events">
        {events.map((event, index) => (
          <AuditEventRow
            key={`${event.time}-${index}`}
            event={event}
            last={index === events.length - 1}
          />
        ))}
      </div>

      {/* FOOTER */}

      <div className="audit-footer">
        <div>
          <ShieldCheck size={12} />
          <span>
            Every agent action is recorded for transparency.
          </span>
        </div>

        <button>
          Export audit
          <ExternalLink size={11} />
        </button>
      </div>
    </div>
  );
}

function AuditStat({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="audit-stat">
      <span>{label}</span>

      <strong className={green ? "audit-green" : ""}>
        {value}
      </strong>
    </div>
  );
}

function AuditEventRow({
  event,
  last,
}: {
  event: AuditEventView;
  last: boolean;
}) {
  const Icon = event.icon;

  return (
    <div className="audit-event">
      <div className="audit-event-track">
        <div
          className={`audit-event-icon ${event.status}`}
        >
          {event.status === "success" ? (
            <Check size={11} />
          ) : event.status === "failed" ? (
            <XCircle size={12} />
          ) : (
            <Icon size={12} />
          )}
        </div>

        {!last && (
          <div className="audit-event-connector" />
        )}
      </div>

      <div className="audit-event-content">
        <div className="audit-event-top">
          <div>
            <span className="audit-event-type">
              {event.type}
            </span>

            <strong>{event.title}</strong>
          </div>

          <span className="audit-event-time">
            <Clock3 size={9} />
            {event.time}
          </span>
        </div>

        <p>{event.description}</p>

        <div className="audit-event-meta">
          {event.tool && (
            <span className="audit-tool">
              <Code2 size={9} />
              {event.tool}
            </span>
          )}

          <span
            className={`audit-status ${event.status}-status`}
          >
            {event.status === "success" ? (
              <Check size={9} />
            ) : event.status === "failed" ? (
              <XCircle size={9} />
            ) : (
              <Clock3 size={9} />
            )}
            {getStatusLabel(event.status)}
          </span>
        </div>
      </div>
    </div>
  );
}

function mapAuditEvent(
  event: AgentAuditEvent
): AuditEventView {
  const type =
    formatEventType(event.eventType);

  return {
    time: formatEventTime(
      event.createdAt
    ),
    type,
    title: getEventTitle(type),
    description: event.message,
    tool: getAuditTool(event),
    status: mapAuditStatus(
      event.status
    ),
    icon: getEventIcon(type),
  };
}

function getAuditTool(
  event: AgentAuditEvent
) {
  const metadataTool =
    event.metadata?.tool;

  if (typeof metadataTool === "string") {
    return metadataTool;
  }

  const metadataEndpoint =
    event.metadata?.endpoint;

  if (
    typeof metadataEndpoint ===
    "string"
  ) {
    return metadataEndpoint;
  }

  return event.actor.toLowerCase();
}

function mapAuditStatus(
  status: string
): AuditStatus {
  const normalized =
    status.toLowerCase();

  if (
    normalized.includes("fail") ||
    normalized.includes("block") ||
    normalized.includes("error")
  ) {
    return "failed";
  }

  if (
    normalized.includes("review")
  ) {
    return "review";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("await")
  ) {
    return "pending";
  }

  return "success";
}

function getStatusLabel(
  status: AuditStatus
) {
  if (status === "success") {
    return "Verified";
  }

  if (status === "failed") {
    return "Stopped safely";
  }

  if (status === "review") {
    return "Needs review";
  }

  return "Awaiting proof";
}

function getEventIcon(
  type: string
) {
  if (type.includes("CATALOG")) {
    return Search;
  }

  if (type.includes("DECISION")) {
    return Sparkles;
  }

  if (type.includes("GROWTH")) {
    return TrendingUp;
  }

  if (type.includes("POLICY")) {
    return ShieldCheck;
  }

  if (
    type.includes("CHECKOUT") ||
    type.includes("PAYMENT")
  ) {
    return CreditCard;
  }

  if (type.includes("WEBHOOK")) {
    return FileCheck2;
  }

  return Bot;
}

function getEventTitle(
  type: string
) {
  return formatStatus(type);
}

function formatEventType(
  type: string
) {
  return type
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();
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

function formatEventTime(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (part: number) =>
    String(part).padStart(2, "0");

  const millis = String(
    date.getMilliseconds()
  ).padStart(3, "0");

  return `${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}.${millis}`;
}

export default AuditTrail;
