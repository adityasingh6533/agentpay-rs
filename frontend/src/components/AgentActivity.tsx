import {
  Bot,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  Database,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import "../styles/AgentActivity.css";

type ActivityStatus = "done" | "running" | "waiting";

type Activity = {
  id: number;
  title: string;
  description: string;
  type: string;
  time: string;
  status: ActivityStatus;
};

const initialActivities: Activity[] = [
  {
    id: 1,
    title: "Customer intent received",
    description: "Running shoes under ₹1500",
    type: "INTENT",
    time: "10:42:18",
    status: "done",
  },
  {
    id: 2,
    title: "Catalog search completed",
    description: "4 relevant products found",
    type: "SEARCH",
    time: "10:42:19",
    status: "done",
  },
  {
    id: 3,
    title: "Purchase intent classified",
    description: "High-intent customer · 94% confidence",
    type: "AI",
    time: "10:42:20",
    status: "done",
  },
  {
    id: 4,
    title: "Cross-sell opportunity detected",
    description: "Running Socks have strong product affinity",
    type: "GROWTH",
    time: "10:42:21",
    status: "done",
  },
  {
    id: 5,
    title: "Merchant policy validation",
    description: "Discount and inventory constraints checked",
    type: "POLICY",
    time: "10:42:21",
    status: "done",
  },
  {
    id: 6,
    title: "Razorpay order preparation",
    description: "Waiting for customer confirmation",
    type: "PAYMENT",
    time: "10:42:22",
    status: "waiting",
  },
];

function AgentActivity({
  activities = initialActivities,
}: {
  activities?: Activity[];
}) {
  return (
    <div className="agent-activity-card">
      <div className="activity-header">
        <div className="activity-heading">
          <div className="activity-main-icon">
            <Bot size={17} />
          </div>

          <div>
            <span>AGENT ACTIVITY</span>
            <strong>Decision Pipeline</strong>
          </div>
        </div>

        <div className="activity-live">
          <span />
          LIVE
        </div>
      </div>

      <div className="activity-progress">
        <div className="progress-info">
          <span>Current task progress</span>
          <strong>5 / 6</strong>
        </div>

        <div className="progress-track">
          <div style={{ width: "83%" }} />
        </div>
      </div>

      <div className="activity-timeline">
        {activities.map((activity, index) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            last={index === activities.length - 1}
          />
        ))}
      </div>

      <div className="activity-footer">
        <div>
          <Database size={12} />
          <span>All events persisted to audit store</span>
        </div>

        <button>
          View complete audit
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

function ActivityItem({
  activity,
  last,
}: {
  activity: Activity;
  last: boolean;
}) {
  const Icon = getActivityIcon(activity.type);

  return (
    <div className="activity-item">
      <div className="activity-track">
        <div
          className={
            activity.status === "running"
              ? "activity-status running"
              : activity.status === "waiting"
              ? "activity-status waiting"
              : "activity-status done"
          }
        >
          {activity.status === "done" ? (
            <Check size={11} />
          ) : activity.status === "waiting" ? (
            <Clock3 size={11} />
          ) : (
            <Icon size={11} />
          )}
        </div>

        {!last && <div className="activity-vertical-line" />}
      </div>

      <div className="activity-details">
        <div className="activity-top">
          <div>
            <span className="activity-type">{activity.type}</span>
            <strong>{activity.title}</strong>
          </div>

          <span className="activity-time">{activity.time}</span>
        </div>

        <p>{activity.description}</p>

        <div className="activity-meta">
          <span
            className={
              activity.status === "waiting"
                ? "status waiting-text"
                : "status"
            }
          >
            {activity.status === "done"
              ? "Completed"
              : activity.status === "waiting"
              ? "Awaiting confirmation"
              : "Running"}
          </span>

          {activity.type === "GROWTH" && (
            <span className="impact">
              <TrendingUp size={9} />
              +₹199 AOV
            </span>
          )}

          {activity.type === "PAYMENT" && (
            <span className="tool">
              <CreditCard size={9} />
              Razorpay
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function getActivityIcon(type: string) {
  switch (type) {
    case "SEARCH":
      return Search;
    case "GROWTH":
      return TrendingUp;
    case "POLICY":
      return ShieldCheck;
    case "PAYMENT":
      return CreditCard;
    case "AI":
      return Sparkles;
    default:
      return Zap;
  }
}

export default AgentActivity;