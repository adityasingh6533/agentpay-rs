import {
  ArrowDownToLine,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  Filter,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import "../styles/Transactions.css";

type Transaction = {
  id: string;
  customer: string;
  initials: string;
  product: string;
  amount: number;
  status: "Captured" | "Pending" | "Failed";
  method: string;
  date: string;
  agentInfluenced: boolean;
  agentAction: string;
};

const transactions: Transaction[] = [
  {
    id: "AGT-8291",
    customer: "Rahul Sharma",
    initials: "RS",
    product: "Velocity Running Shoes + Socks",
    amount: 1398,
    status: "Captured",
    method: "UPI",
    date: "Today · 10:42 AM",
    agentInfluenced: true,
    agentAction: "Cross-sell",
  },
  {
    id: "AGT-8290",
    customer: "Amit Verma",
    initials: "AV",
    product: "Aero Sports Jacket",
    amount: 1899,
    status: "Captured",
    method: "Card",
    date: "Today · 09:31 AM",
    agentInfluenced: true,
    agentAction: "Recommendation",
  },
  {
    id: "AGT-8289",
    customer: "Neha Singh",
    initials: "NS",
    product: "FlexRun Sports Shorts",
    amount: 899,
    status: "Captured",
    method: "UPI",
    date: "Today · 08:54 AM",
    agentInfluenced: false,
    agentAction: "",
  },
  {
    id: "AGT-8288",
    customer: "Rohan Gupta",
    initials: "RG",
    product: "Sprint Performance Tee",
    amount: 699,
    status: "Pending",
    method: "UPI",
    date: "Yesterday · 11:42 PM",
    agentInfluenced: true,
    agentAction: "Bundle",
  },
  {
    id: "AGT-8287",
    customer: "Priya Kapoor",
    initials: "PK",
    product: "Velocity Running Shoes",
    amount: 1299,
    status: "Captured",
    method: "Card",
    date: "Yesterday · 08:18 PM",
    agentInfluenced: true,
    agentAction: "Recommendation",
  },
  {
    id: "AGT-8286",
    customer: "Karan Mehta",
    initials: "KM",
    product: "ProFit Running Socks",
    amount: 199,
    status: "Failed",
    method: "UPI",
    date: "Yesterday · 06:41 PM",
    agentInfluenced: false,
    agentAction: "",
  },
];

function Transactions() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [agentOnly, setAgentOnly] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const query = search.toLowerCase();

      const matchesSearch =
        transaction.id.toLowerCase().includes(query) ||
        transaction.customer.toLowerCase().includes(query) ||
        transaction.product.toLowerCase().includes(query);

      const matchesStatus =
        status === "All" ||
        transaction.status === status;

      const matchesAgent =
        !agentOnly ||
        transaction.agentInfluenced;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesAgent
      );
    });
  }, [search, status, agentOnly]);

  const capturedRevenue = transactions
    .filter((item) => item.status === "Captured")
    .reduce((sum, item) => sum + item.amount, 0);

  const agentRevenue = transactions
    .filter(
      (item) =>
        item.status === "Captured" &&
        item.agentInfluenced
    )
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="transactions-page">
      {/* HEADER */}

      <div className="transactions-header">
        <div>
          <div className="transactions-eyebrow">
            MERCHANT PAYMENTS
          </div>

          <h1>Transactions</h1>

          <p>
            Track payments, agent influence and checkout activity.
          </p>
        </div>

        <button className="export-button">
          <ArrowDownToLine size={13} />
          Export
        </button>
      </div>

      {/* AI PAYMENT INSIGHT */}

      <div className="transaction-ai-banner">
        <div className="transaction-ai-icon">
          <Bot size={18} />
        </div>

        <div>
          <span>AGENT REVENUE</span>

          <strong>
            ₹{agentRevenue.toLocaleString("en-IN")} influenced by AI
          </strong>

          <p>
            Your agent influenced{" "}
            {transactions.filter(
              (item) => item.agentInfluenced
            ).length}{" "}
            recent transactions through recommendations and
            cross-sells.
          </p>
        </div>

        <div className="agent-revenue-growth">
          <TrendingUp size={12} />
          +31.6%
        </div>
      </div>

      {/* STATS */}

      <div className="transaction-stats">
        <TransactionStat
          label="CAPTURED REVENUE"
          value={`₹${capturedRevenue.toLocaleString("en-IN")}`}
          icon={<CreditCard size={15} />}
        />

        <TransactionStat
          label="TRANSACTIONS"
          value="148"
          icon={<ShieldCheck size={15} />}
        />

        <TransactionStat
          label="AI INFLUENCED"
          value="63"
          icon={<Sparkles size={15} />}
          purple
        />

        <TransactionStat
          label="SUCCESS RATE"
          value="96.8%"
          icon={<Check size={15} />}
          green
        />
      </div>

      {/* TOOLBAR */}

      <div className="transactions-toolbar">
        <div className="transaction-search">
          <Search size={14} />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search transaction, customer..."
          />

          {search && (
            <button
              onClick={() => setSearch("")}
            >
              <X size={11} />
            </button>
          )}
        </div>

        <div className="transaction-filters">
          <div className="transaction-select">
            <Filter size={11} />

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
            >
              <option>All</option>
              <option>Captured</option>
              <option>Pending</option>
              <option>Failed</option>
            </select>

            <ChevronDown size={11} />
          </div>

          <button
            className={
              agentOnly
                ? "agent-filter active"
                : "agent-filter"
            }
            onClick={() =>
              setAgentOnly((value) => !value)
            }
          >
            <Sparkles size={11} />
            AI influenced
          </button>
        </div>
      </div>

      {/* TABLE */}

      <div className="transactions-card">
        <div className="transactions-card-header">
          <div>
            <span>PAYMENT ACTIVITY</span>

            <strong>
              {filteredTransactions.length} recent transactions
            </strong>
          </div>

          <div className="live-transactions">
            <span />
            LIVE
          </div>
        </div>

        <div className="transaction-table">
          <div className="transaction-row transaction-head">
            <span>TRANSACTION</span>
            <span>CUSTOMER</span>
            <span>AMOUNT</span>
            <span>PAYMENT</span>
            <span>AGENT</span>
            <span>STATUS</span>
            <span />
          </div>

          {filteredTransactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
            />
          ))}

          {filteredTransactions.length === 0 && (
            <div className="transaction-empty">
              <Search size={22} />

              <strong>No transactions found</strong>

              <span>
                Try changing your search or filters.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* PAYMENT VERIFICATION */}

      <div className="verification-card">
        <div className="verification-icon">
          <ShieldCheck size={17} />
        </div>

        <div>
          <span>RAZORPAY VERIFICATION</span>

          <strong>
            Payment integrity checks are active
          </strong>

          <p>
            Every successful payment is verified through the
            Razorpay payment flow before the agent marks an order
            as completed.
          </p>
        </div>

        <div className="verification-status">
          <Check size={11} />
          VERIFIED
        </div>
      </div>
    </div>
  );
}

function TransactionStat({
  label,
  value,
  icon,
  green = false,
  purple = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  green?: boolean;
  purple?: boolean;
}) {
  return (
    <div className="transaction-stat">
      <div
        className={
          green
            ? "transaction-stat-icon green"
            : purple
            ? "transaction-stat-icon purple"
            : "transaction-stat-icon"
        }
      >
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function TransactionRow({
  transaction,
}: {
  transaction: Transaction;
}) {
  return (
    <div className="transaction-row">
      {/* ID */}

      <div className="transaction-id">
        <strong>{transaction.id}</strong>

        <span>{transaction.date}</span>
      </div>

      {/* CUSTOMER */}

      <div className="transaction-customer">
        <div className="customer-initials">
          {transaction.initials}
        </div>

        <div>
          <strong>{transaction.customer}</strong>

          <span>{transaction.product}</span>
        </div>
      </div>

      {/* AMOUNT */}

      <strong className="transaction-amount">
        ₹{transaction.amount.toLocaleString("en-IN")}
      </strong>

      {/* PAYMENT */}

      <div className="transaction-payment">
        <CreditCard size={11} />

        <div>
          <strong>{transaction.method}</strong>
          <span>Razorpay</span>
        </div>
      </div>

      {/* AGENT */}

      <div>
        {transaction.agentInfluenced ? (
          <div className="agent-influence">
            <Sparkles size={9} />
            {transaction.agentAction}
          </div>
        ) : (
          <span className="no-agent">
            Direct
          </span>
        )}
      </div>

      {/* STATUS */}

      <div
        className={`transaction-status ${transaction.status.toLowerCase()}`}
      >
        {transaction.status === "Captured" && (
          <Check size={9} />
        )}

        {transaction.status === "Pending" && (
          <Clock3 size={9} />
        )}

        {transaction.status === "Failed" && (
          <X size={9} />
        )}

        {transaction.status}
      </div>

      {/* VIEW */}

      <button
        className="view-transaction"
        title="View transaction"
      >
        <Eye size={13} />
      </button>
    </div>
  );
}

export default Transactions;