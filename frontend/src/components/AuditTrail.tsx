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
} from "lucide-react";
import "../styles/AuditTrail.css";

type AuditEvent = {
  time: string;
  type: string;
  title: string;
  description: string;
  tool?: string;
  status: "success" | "pending";
  icon: any;
};

const auditEvents: AuditEvent[] = [
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
          value="7"
        />

        <AuditStat
          label="TOOLS CALLED"
          value="6"
        />

        <AuditStat
          label="DECISIONS"
          value="3"
        />

        <AuditStat
          label="STATUS"
          value="ACTIVE"
          green
        />
      </div>

      {/* TIMELINE */}

      <div className="audit-events">
        {auditEvents.map((event, index) => (
          <AuditEvent
            key={`${event.time}-${index}`}
            event={event}
            last={index === auditEvents.length - 1}
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

function AuditEvent({
  event,
  last,
}: {
  event: AuditEvent;
  last: boolean;
}) {
  const Icon = event.icon;

  return (
    <div className="audit-event">
      <div className="audit-event-track">
        <div
          className={
            event.status === "success"
              ? "audit-event-icon success"
              : "audit-event-icon pending"
          }
        >
          {event.status === "success" ? (
            <Check size={11} />
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

          {event.status === "success" ? (
            <span className="audit-status success-status">
              <Check size={9} />
              Verified
            </span>
          ) : (
            <span className="audit-status pending-status">
              <Clock3 size={9} />
              Awaiting webhook
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuditTrail;