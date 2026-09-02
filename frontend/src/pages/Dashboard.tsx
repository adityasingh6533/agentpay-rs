import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  ChevronRight,
  CreditCard,
  Package,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import api, {
  type AnalyticsTransaction,
  type AnalyticsTopProduct,
  type DashboardAnalytics,
} from "../services/api";

function Dashboard() {
  const [analytics, setAnalytics] =
    useState<DashboardAnalytics | null>(null);
  const [loadError, setLoadError] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    api.analytics
      .dashboard()
      .then((data) => {
        if (mounted) {
          setAnalytics(data);
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (mounted) {
          setAnalytics(null);
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load dashboard."
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const chartValues = useMemo(
    () =>
      buildChartValues(
        analytics?.recent_transactions ?? []
      ),
    [analytics]
  );

  const summary = analytics?.summary;
  const topProducts =
    analytics?.top_products ?? [];
  const recentTransactions =
    analytics?.recent_transactions ?? [];

  return (
    <div className="dashboard">
      <div className="topbar">
        <div>
          <p className="eyebrow">MERCHANT OVERVIEW</p>
          <h1>Good evening, Merchant</h1>
          <p className="muted">
            Live backend metrics from the agent commerce
            pipeline.
          </p>
        </div>

        <div className="agent-status">
          <span className="pulse" />
          <span>
            {loadError ? "Backend Offline" : "Agent Online"}
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Pipeline Revenue"
          value={formatCurrency(
            summary?.pipeline_revenue ?? 0
          )}
          change="live"
          positive={!loadError}
          icon={<TrendingUp size={20} />}
        />

        <StatCard
          title="Checkouts"
          value={`${summary?.total_checkouts ?? 0}`}
          change="backend"
          positive={!loadError}
          icon={<CreditCard size={20} />}
        />

        <StatCard
          title="Success Rate"
          value={formatPercent(
            summary?.success_rate ?? 100
          )}
          change={`${summary?.failed_checkouts ?? 0} failed`}
          positive={(summary?.failed_checkouts ?? 0) === 0}
          icon={<Activity size={20} />}
        />

        <StatCard
          title="Agent Revenue"
          value={formatCurrency(
            summary?.agent_revenue ?? 0
          )}
          change={`${summary?.agent_checkouts ?? 0} actions`}
          positive={!loadError}
          icon={<Sparkles size={20} />}
        />
      </div>

      <div className="main-grid">
        <div className="panel revenue-panel">
          <div className="panel-header">
            <div>
              <h2>Revenue Performance</h2>
              <p className="muted">Recent backend checkouts</p>
            </div>

            <button className="ghost-button">
              Live <ChevronRight size={15} />
            </button>
          </div>

          <div className="revenue-value">
            {formatCurrency(
              summary?.pipeline_revenue ?? 0
            )}
            <span>
              <ArrowUpRight size={16} />
              {formatPercent(
                analytics?.growth.aov_uplift_percent ?? 0
              )}{" "}
              AOV uplift
            </span>
          </div>

          <div className="chart">
            {chartValues.map((height, index) => (
              <div
                className="bar-wrapper"
                key={`${height}-${index}`}
              >
                <div
                  className="bar"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>

          <div className="chart-labels">
            <span>Earlier</span>
            <span>Recent</span>
            <span>Latest</span>
          </div>
        </div>

        <div className="panel agent-panel">
          <div className="panel-header">
            <div className="agent-title">
              <div className="icon-box purple">
                <Bot size={19} />
              </div>

              <div>
                <h2>AI Revenue Agent</h2>
                <p className="muted">Autonomous growth engine</p>
              </div>
            </div>

            <span className="live-badge">LIVE</span>
          </div>

          <div className="agent-metric">
            <div>
              <span className="metric-label">
                Revenue influenced
              </span>
              <strong>
                {formatCurrency(
                  summary?.agent_revenue ?? 0
                )}
              </strong>
            </div>

            <span className="growth">
              <ArrowUpRight size={14} />
              {formatPercent(
                analytics?.growth.cross_sell_attach_rate ?? 0
              )}
            </span>
          </div>

          <div className="agent-event">
            <div className="event-icon">
              <Zap size={16} />
            </div>

            <div className="event-content">
              <strong>
                Growth opportunity detected
              </strong>
              <p>
                Cross-sell revenue is{" "}
                {formatCurrency(
                  summary?.cross_sell_revenue ?? 0
                )}{" "}
                from guarded agent checkout flows.
              </p>

              <button className="review-button">
                Review recommendation
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>

          <div className="agent-footer">
            <span>
              <span className="small-dot" />
              {summary?.audit_events ?? 0} audit events recorded
            </span>

            <span>View activity {">"}</span>
          </div>
        </div>
      </div>

      <div className="bottom-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Top Products</h2>
              <p className="muted">
                From checkout and catalog data
              </p>
            </div>

            <button className="text-button">View all {">"}</button>
          </div>

          {topProducts.length === 0 ? (
            <EmptyPanelText text="No catalog products loaded from backend." />
          ) : (
            topProducts.slice(0, 3).map((product) => (
              <Product key={product.id} product={product} />
            ))
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Recent Transactions</h2>
              <p className="muted">
                Latest backend checkout activity
              </p>
            </div>

            <button className="text-button">View all {">"}</button>
          </div>

          {recentTransactions.length === 0 ? (
            <EmptyPanelText
              text={
                loadError ||
                "Create an order from the AI Agent page to populate this panel."
              }
            />
          ) : (
            recentTransactions
              .slice(0, 3)
              .map((transaction) => (
                <Transaction
                  key={transaction.id}
                  transaction={transaction}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  positive,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <div className="stat-icon">{icon}</div>
      </div>

      <strong>{value}</strong>

      <div className={positive ? "positive" : "negative"}>
        {positive ? (
          <ArrowUpRight size={14} />
        ) : (
          <ArrowDownRight size={14} />
        )}
        {change}
        <span className="muted">from backend</span>
      </div>
    </div>
  );
}

function Product({
  product,
}: {
  product: AnalyticsTopProduct;
}) {
  return (
    <div className="list-item">
      <div className="product-image">
        <Package size={19} />
      </div>

      <div className="item-info">
        <strong>{product.name}</strong>
        <span>{product.category}</span>
      </div>

      <div className="item-value">
        <strong>{formatCurrency(product.revenue)}</strong>
        <span className="positive">
          {product.growth_signal}
        </span>
      </div>
    </div>
  );
}

function Transaction({
  transaction,
}: {
  transaction: AnalyticsTransaction;
}) {
  return (
    <div className="list-item">
      <div className="avatar">
        {getInitials(transaction.customer_name)}
      </div>

      <div className="item-info">
        <strong>{transaction.customer_name}</strong>
        <span>{transaction.product_summary}</span>
      </div>

      <div className="item-value">
        <strong>{formatCurrency(transaction.amount)}</strong>
        <span
          className={
            transaction.status === "PAID" ? "paid" : "pending"
          }
        >
          {formatCheckoutStatus(transaction.status)}
        </span>
      </div>
    </div>
  );
}

function EmptyPanelText({ text }: { text: string }) {
  return <p className="muted">{text}</p>;
}

function buildChartValues(
  transactions: AnalyticsTransaction[]
) {
  if (transactions.length === 0) {
    return [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8];
  }

  const amounts = transactions
    .slice()
    .reverse()
    .slice(-12)
    .map((transaction) => transaction.amount);
  const max = Math.max(...amounts, 1);

  return amounts.map((amount) =>
    Math.max(10, Math.round((amount / max) * 100))
  );
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

function formatCheckoutStatus(status: string) {
  if (status === "PAID") {
    return "Paid";
  }

  if (status === "FAILED") {
    return "Failed";
  }

  return "Pending";
}

function formatCurrency(amount: number) {
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

export default Dashboard;
