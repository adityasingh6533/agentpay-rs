import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  Package,
  CreditCard,
  Activity,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import "./App.css"
import Catalog from "./pages/Catalog";
import Agent from "./pages/Agent";
import Transactions from "./pages/Transactions";
import AuditTrail from "./components/AuditTrail";
import Shop from "./pages/Shop";
import PaymentSuccess from "./pages/PaymentSuccess";
const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "AI Agent", path: "/agent", icon: Bot },
  { name: "Catalog", path: "/catalog", icon: Package },
  { name: "Transactions", path: "/transactions", icon: CreditCard },
];

function Dashboard() {
  return (
    <div className="dashboard">
      <div className="topbar">
        <div>
          <p className="eyebrow">MERCHANT OVERVIEW</p>
          <h1>Good evening, Merchant 👋</h1>
          <p className="muted">
            Your AI revenue engine is working for you.
          </p>
        </div>

        <div className="agent-status">
          <span className="pulse" />
          <span>Agent Online</span>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Revenue"
          value="₹1,84,200"
          change="+18.4%"
          positive
          icon={<TrendingUp size={20} />}
        />

        <StatCard
          title="Orders"
          value="148"
          change="+12.8%"
          positive
          icon={<CreditCard size={20} />}
        />

        <StatCard
          title="Conversion Rate"
          value="7.8%"
          change="+2.1%"
          positive
          icon={<Activity size={20} />}
        />

        <StatCard
          title="Agent Revenue"
          value="₹42,600"
          change="+31.6%"
          positive
          icon={<Sparkles size={20} />}
        />
      </div>

      <div className="main-grid">
        <div className="panel revenue-panel">
          <div className="panel-header">
            <div>
              <h2>Revenue Performance</h2>
              <p className="muted">Last 30 days</p>
            </div>

            <button className="ghost-button">
              30 Days <ChevronRight size={15} />
            </button>
          </div>

          <div className="revenue-value">
            ₹1,84,200
            <span>
              <ArrowUpRight size={16} /> 18.4%
            </span>
          </div>

          <div className="chart">
            {[35, 48, 42, 58, 52, 67, 61, 73, 69, 82, 76, 91].map(
              (height, i) => (
                <div className="bar-wrapper" key={i}>
                  <div
                    className="bar"
                    style={{ height: `${height}%` }}
                  />
                </div>
              )
            )}
          </div>

          <div className="chart-labels">
            <span>Jul 22</span>
            <span>Jul 29</span>
            <span>Aug 05</span>
            <span>Aug 12</span>
            <span>Aug 21</span>
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
              <span className="metric-label">Revenue influenced</span>
              <strong>₹42,600</strong>
            </div>

            <span className="growth">
              <ArrowUpRight size={14} />
              31.6%
            </span>
          </div>

          <div className="agent-event">
            <div className="event-icon">
              <Zap size={16} />
            </div>

            <div className="event-content">
              <strong>Growth opportunity detected</strong>
              <p>
                Running Shoes have high views but low conversion.
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
              3 actions completed today
            </span>

            <span>View activity →</span>
          </div>
        </div>
      </div>

      <div className="bottom-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Top Products</h2>
              <p className="muted">Best performing products</p>
            </div>

            <button className="text-button">View all →</button>
          </div>

          <Product
            name="Velocity Running Shoes"
            category="Footwear"
            revenue="₹48,920"
            growth="+24%"
          />

          <Product
            name="ProFit Training Socks"
            category="Accessories"
            revenue="₹21,480"
            growth="+18%"
          />

          <Product
            name="Aero Sports Jacket"
            category="Apparel"
            revenue="₹18,920"
            growth="+12%"
          />
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Recent Transactions</h2>
              <p className="muted">Latest customer activity</p>
            </div>

            <button className="text-button">View all →</button>
          </div>

          <Transaction
            customer="Rahul Sharma"
            product="Velocity Running Shoes"
            amount="₹1,299"
            status="Paid"
          />

          <Transaction
            customer="Ananya Verma"
            product="Training Socks + Shoes"
            amount="₹1,498"
            status="Paid"
          />

          <Transaction
            customer="Arjun Mehta"
            product="Aero Sports Jacket"
            amount="₹1,899"
            status="Pending"
          />
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
  icon: React.ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <div className="stat-icon">{icon}</div>
      </div>

      <strong>{value}</strong>

      <div className={positive ? "positive" : "negative"}>
        {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {change}
        <span className="muted">vs last month</span>
      </div>
    </div>
  );
}

function Product({
  name,
  category,
  revenue,
  growth,
}: {
  name: string;
  category: string;
  revenue: string;
  growth: string;
}) {
  return (
    <div className="list-item">
      <div className="product-image">
        <Package size={19} />
      </div>

      <div className="item-info">
        <strong>{name}</strong>
        <span>{category}</span>
      </div>

      <div className="item-value">
        <strong>{revenue}</strong>
        <span className="positive">{growth}</span>
      </div>
    </div>
  );
}

function Transaction({
  customer,
  product,
  amount,
  status,
}: {
  customer: string;
  product: string;
  amount: string;
  status: string;
}) {
  return (
    <div className="list-item">
      <div className="avatar">
        {customer
          .split(" ")
          .map((x) => x[0])
          .join("")}
      </div>

      <div className="item-info">
        <strong>{customer}</strong>
        <span>{product}</span>
      </div>

      <div className="item-value">
        <strong>{amount}</strong>
        <span className={status === "Paid" ? "paid" : "pending"}>
          {status}
        </span>
      </div>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="placeholder">
      <div className="icon-box purple">
        <Sparkles />
      </div>
      <h1>{title}</h1>
      <p>Module is being built.</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <Zap size={20} />
            </div>
            <span>Agent<span>Pay</span></span>
          </div>

          <div className="workspace">
            <span className="workspace-label">WORKSPACE</span>
            <div className="merchant">
              <div className="merchant-avatar">A</div>
              <div>
                <strong>Acme Store</strong>
                <span>Merchant</span>
              </div>
              <ChevronRight size={15} />
            </div>
          </div>

          <nav>
            <span className="nav-label">OVERVIEW</span>

            {navItems.map(({ name, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <Icon size={18} />
                <span>{name}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="system-status">
              <span className="small-dot" />
              <div>
                <strong>All systems operational</strong>
                <span>AgentPay infrastructure</span>
              </div>
            </div>

            <div className="version">AgentPay v0.1.0</div>
          </div>
        </aside>

        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agent" element={<Agent />}/>
           <Route path="/catalog" element={<Catalog />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/audit" element={<AuditTrail />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/payment-success"  element={<PaymentSuccess />}/>
         

          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
