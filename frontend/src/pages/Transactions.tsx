import {
  ArrowDownToLine,
  Bot,
  Check,
  ChevronDown,
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
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "../styles/Transactions.css";
import api, {
  type AnalyticsTransaction,
} from "../services/api";

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

function Transactions() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [agentOnly, setAgentOnly] = useState(false);
  const [transactions, setTransactions] =
    useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<
    string | null
  >(null);

  useEffect(() => {
    let mounted = true;

    api.analytics
      .transactions({ limit: 50 })
      .then((items) => {
        if (mounted) {
          setTransactions(items.map(mapTransaction));
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (mounted) {
          setTransactions([]);
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load transactions."
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const query = search.toLowerCase();

      const matchesSearch =
        transaction.id.toLowerCase().includes(query) ||
        transaction.customer.toLowerCase().includes(query) ||
        transaction.product.toLowerCase().includes(query);

      const matchesStatus =
        status === "All" || transaction.status === status;

      const matchesAgent =
        !agentOnly || transaction.agentInfluenced;

      return matchesSearch && matchesStatus && matchesAgent;
    });
  }, [search, status, agentOnly, transactions]);

  const capturedRevenue = transactions
    .filter((item) => item.status === "Captured")
    .reduce((sum, item) => sum + item.amount, 0);

  const agentRevenue = transactions
    .filter(
      (item) =>
        item.status === "Captured" && item.agentInfluenced
    )
    .reduce((sum, item) => sum + item.amount, 0);

  const agentCount = transactions.filter(
    (item) => item.agentInfluenced
  ).length;

  return (
    <div className="transactions-page">
      <div className="transactions-header">
        <div>
          <div className="transactions-eyebrow">
            MERCHANT PAYMENTS
          </div>

          <h1>Transactions</h1>

          <p>
            Real checkout activity from the backend payment
            pipeline.
          </p>
        </div>

        <button className="export-button">
          <ArrowDownToLine size={13} />
          Export
        </button>
      </div>

      <div className="transaction-ai-banner">
        <div className="transaction-ai-icon">
          <Bot size={18} />
        </div>

        <div>
          <span>AGENT REVENUE</span>

          <strong>
            {formatCurrency(agentRevenue)} influenced by AI
          </strong>

          <p>
            {agentCount} checkout
            {agentCount === 1 ? "" : "s"} came through
            recommendation, cross-sell or guarded agent action.
          </p>
        </div>

        <div className="agent-revenue-growth">
          <TrendingUp size={12} />
          LIVE
        </div>
      </div>

      <div className="transaction-stats">
        <TransactionStat
          label="CAPTURED REVENUE"
          value={formatCurrency(capturedRevenue)}
          icon={<CreditCard size={15} />}
        />

        <TransactionStat
          label="TRANSACTIONS"
          value={`${transactions.length}`}
          icon={<ShieldCheck size={15} />}
        />

        <TransactionStat
          label="AI INFLUENCED"
          value={`${agentCount}`}
          icon={<Sparkles size={15} />}
          purple
        />

        <TransactionStat
          label="SUCCESS RATE"
          value={formatSuccessRate(transactions)}
          icon={<Check size={15} />}
          green
        />
      </div>

      <div className="transactions-toolbar">
        <div className="transaction-search">
          <Search size={14} />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transaction, customer..."
          />

          {search && (
            <button onClick={() => setSearch("")}>
              <X size={11} />
            </button>
          )}
        </div>

        <div className="transaction-filters">
          <div className="transaction-select">
            <Filter size={11} />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
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
              agentOnly ? "agent-filter active" : "agent-filter"
            }
            onClick={() => setAgentOnly((value) => !value)}
          >
            <Sparkles size={11} />
            AI influenced
          </button>
        </div>
      </div>

      <div className="transactions-card">
        <div className="transactions-card-header">
          <div>
            <span>PAYMENT ACTIVITY</span>

            <strong>
              {isLoading
                ? "Loading checkout activity"
                : `${filteredTransactions.length} recent transactions`}
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

          {!isLoading && filteredTransactions.length === 0 && (
            <div className="transaction-empty">
              <Search size={22} />

              <strong>
                {loadError
                  ? "Transactions unavailable"
                  : "No transactions found"}
              </strong>

              <span>
                {loadError ||
                  "Create a Razorpay order from the AI Agent page, then return here."}
              </span>
            </div>
          )}
        </div>
      </div>

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
            Orders shown here are created by the backend after
            signed-intent authorization and customer confirmation.
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
      <div className="transaction-id">
        <strong>{transaction.id}</strong>
        <span>{transaction.date}</span>
      </div>

      <div className="transaction-customer">
        <div className="customer-initials">
          {transaction.initials}
        </div>

        <div>
          <strong>{transaction.customer}</strong>
          <span>{transaction.product}</span>
        </div>
      </div>

      <strong className="transaction-amount">
        {formatCurrency(transaction.amount)}
      </strong>

      <div className="transaction-payment">
        <CreditCard size={11} />

        <div>
          <strong>{transaction.method}</strong>
          <span>Razorpay</span>
        </div>
      </div>

      <div>
        {transaction.agentInfluenced ? (
          <div className="agent-influence">
            <Sparkles size={9} />
            {transaction.agentAction}
          </div>
        ) : (
          <span className="no-agent">Direct</span>
        )}
      </div>

      <div
        className={`transaction-status ${transaction.status.toLowerCase()}`}
      >
        {transaction.status === "Captured" && <Check size={9} />}
        {transaction.status === "Pending" && <Clock3 size={9} />}
        {transaction.status === "Failed" && <X size={9} />}
        {transaction.status}
      </div>

      <button
        className="view-transaction"
        title="View transaction"
      >
        <Eye size={13} />
      </button>
    </div>
  );
}

function mapTransaction(
  transaction: AnalyticsTransaction
): Transaction {
  return {
    id: transaction.id.slice(0, 8),
    customer: transaction.customer_name,
    initials: getInitials(transaction.customer_name),
    product: transaction.product_summary || "Checkout",
    amount: transaction.amount,
    status: mapStatus(transaction.status),
    method: "Razorpay",
    date: formatDate(transaction.created_at),
    agentInfluenced: transaction.agent_influenced,
    agentAction:
      transaction.agent_action === "Direct"
        ? ""
        : transaction.agent_action,
  };
}

function mapStatus(status: string): Transaction["status"] {
  if (status === "PAID") {
    return "Captured";
  }

  if (status === "FAILED") {
    return "Failed";
  }

  return "Pending";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(amount: number) {
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

function formatSuccessRate(transactions: Transaction[]) {
  const completed = transactions.filter(
    (item) =>
      item.status === "Captured" ||
      item.status === "Failed"
  );

  if (completed.length === 0) {
    return "100%";
  }

  const captured = completed.filter(
    (item) => item.status === "Captured"
  ).length;

  return `${Math.round(
    (captured / completed.length) * 100
  )}%`;
}

export default Transactions;
