import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
} from "react-router-dom";
import {
  Bot,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Package,
  ShieldCheck,
  Zap,
} from "lucide-react";

import "./App.css";
import "./styles/RichUI.css";

import { AgentProvider } from "./context/AgentContext";
import Agent from "./pages/Agent";
import Catalog from "./pages/Catalog";
import Guardrails from "./pages/Guardrails";
import LiveDashboard from "./pages/Dashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import Shop from "./pages/Shop";
import Transactions from "./pages/Transactions";
import AuditTrail from "./components/AuditTrail";

const navItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "AI Agent",
    path: "/agent",
    icon: Bot,
  },
  {
    name: "Catalog",
    path: "/catalog",
    icon: Package,
  },
  {
    name: "Transactions",
    path: "/transactions",
    icon: CreditCard,
  },
  {
    name: "Guardrails",
    path: "/guardrails",
    icon: ShieldCheck,
  },
];

function App() {
  const customerId =
    process.env.REACT_APP_CUSTOMER_ID ||
    "demo-customer";

  return (
    <AgentProvider customerId={customerId}>
      <BrowserRouter>
        <div className="app">
          <aside className="sidebar">
            <div className="brand">
              <div className="brand-mark">
                <Zap size={20} />
              </div>

              <span>
                Agent<span>Pay</span>
              </span>
            </div>

            <div className="workspace">
              <span className="workspace-label">
                WORKSPACE
              </span>

              <div className="merchant">
                <div className="merchant-avatar">
                  A
                </div>

                <div>
                  <strong>Acme Store</strong>
                  <span>Merchant</span>
                </div>

                <ChevronRight size={15} />
              </div>
            </div>

            <nav>
              <span className="nav-label">
                OVERVIEW
              </span>

              {navItems.map(
                ({
                  name,
                  path,
                  icon: Icon,
                }) => (
                  <NavLink
                    key={path}
                    to={path}
                    className={(props) =>
                      props.isActive
                        ? "nav-item active"
                        : "nav-item"
                    }
                  >
                    <Icon size={18} />
                    <span>{name}</span>
                  </NavLink>
                )
              )}
            </nav>

            <div className="sidebar-bottom">
              <div className="system-status">
                <span className="small-dot" />

                <div>
                  <strong>
                    Backend-driven demo
                  </strong>

                  <span>
                    AgentPay infrastructure
                  </span>
                </div>
              </div>

              <div className="version">
                AgentPay v0.1.0
              </div>
            </div>
          </aside>

          <main className="content">
            <Routes>
              <Route
                path="/"
                element={<LiveDashboard />}
              />
              <Route
                path="/agent"
                element={<Agent />}
              />
              <Route
                path="/catalog"
                element={<Catalog />}
              />
              <Route
                path="/transactions"
                element={<Transactions />}
              />
              <Route
                path="/guardrails"
                element={<Guardrails />}
              />
              <Route
                path="/audit"
                element={<AuditTrail />}
              />
              <Route
                path="/shop"
                element={<Shop />}
              />
              <Route
                path="/payment-success"
                element={<PaymentSuccess />}
              />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AgentProvider>
  );
}

export default App;
