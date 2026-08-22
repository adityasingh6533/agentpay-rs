import {
  ArrowUpRight,
  Bot,
  ChevronDown,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import "../styles/Catalog.css";

const products = [
  {
    name: "Velocity Running Shoes",
    sku: "VR-SHOE-001",
    category: "Footwear",
    price: "₹1,299",
    stock: 84,
    revenue: "₹48,920",
    conversion: "8.9%",
    change: "+24.2%",
    status: "Strong",
  },
  {
    name: "ProFit Training Socks",
    sku: "PF-SOCK-021",
    category: "Accessories",
    price: "₹199",
    stock: 142,
    revenue: "₹21,480",
    conversion: "12.4%",
    change: "+18.7%",
    status: "Strong",
  },
  {
    name: "Aero Sports Jacket",
    sku: "AS-JKT-014",
    category: "Apparel",
    price: "₹1,899",
    stock: 37,
    revenue: "₹18,920",
    conversion: "6.2%",
    change: "+12.1%",
    status: "Growing",
  },
  {
    name: "FlexRun Sports Shorts",
    sku: "FR-SRT-009",
    category: "Apparel",
    price: "₹899",
    stock: 61,
    revenue: "₹12,640",
    conversion: "4.1%",
    change: "-8.4%",
    status: "Opportunity",
  },
  {
    name: "HydroMax Sports Bottle",
    sku: "HM-BTL-004",
    category: "Accessories",
    price: "₹349",
    stock: 218,
    revenue: "₹8,940",
    conversion: "3.7%",
    change: "-3.2%",
    status: "Opportunity",
  },
];

function Catalog() {
  return (
    <div className="catalog-page">
      {/* HEADER */}

      <div className="catalog-header">
        <div>
          <div className="eyebrow">MERCHANT CATALOG</div>
          <h1>Product Intelligence</h1>
          <p>
            Understand product performance and let AI find your next growth
            opportunity.
          </p>
        </div>

        <button className="add-product">
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* KPI */}

      <div className="catalog-stats">
        <Metric
          icon={<Package size={18} />}
          label="Total Products"
          value="128"
          sub="+8 this month"
        />

        <Metric
          icon={<TrendingUp size={18} />}
          label="Catalog Revenue"
          value="₹1.84L"
          sub="+18.4% this month"
        />

        <Metric
          icon={<Users size={18} />}
          label="Avg. Conversion"
          value="7.8%"
          sub="+2.1% this month"
        />

        <Metric
          icon={<Sparkles size={18} />}
          label="AI Opportunities"
          value="12"
          sub="3 high priority"
        />
      </div>

      {/* AI INSIGHT */}

      <div className="catalog-ai-banner">
        <div className="ai-banner-icon">
          <Bot size={21} />
        </div>

        <div className="ai-banner-content">
          <div className="ai-banner-title">
            <span>AI GROWTH INSIGHT</span>
            <span className="priority">HIGH PRIORITY</span>
          </div>

          <h3>FlexRun Sports Shorts have an untapped revenue opportunity.</h3>

          <p>
            The product receives strong traffic but converts at only 4.1%.
            Customers who purchase Velocity Running Shoes frequently buy
            these shorts too.
          </p>
        </div>

        <div className="ai-banner-action">
          <div>
            <span>Potential uplift</span>
            <strong>+₹8,400/mo</strong>
          </div>

          <button>
            Review with Agent
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* TOOLBAR */}

      <div className="catalog-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input placeholder="Search products..." />
        </div>

        <button className="filter-button">
          All Categories
          <ChevronDown size={14} />
        </button>

        <button className="filter-button">
          Performance
          <ChevronDown size={14} />
        </button>
      </div>

      {/* TABLE */}

      <div className="product-table">
        <div className="table-head">
          <span>PRODUCT</span>
          <span>PRICE</span>
          <span>STOCK</span>
          <span>REVENUE</span>
          <span>CONVERSION</span>
          <span>PERFORMANCE</span>
          <span />
        </div>

        {products.map((product) => (
          <ProductRow key={product.sku} product={product} />
        ))}
      </div>

      {/* AI RECOMMENDATIONS */}

      <div className="catalog-bottom">
        <div className="catalog-panel">
          <div className="panel-heading">
            <div className="heading-icon purple">
              <Sparkles size={16} />
            </div>

            <div>
              <span>AGENT RECOMMENDATIONS</span>
              <strong>Actions that can grow revenue</strong>
            </div>
          </div>

          <Recommendation
            icon={<Zap size={15} />}
            title="Create a shoe + socks bundle"
            description="Strong purchase affinity detected between Velocity Shoes and ProFit Socks."
            impact="+₹5,200/mo"
          />

          <Recommendation
            icon={<TrendingUp size={15} />}
            title="Promote Aero Sports Jacket"
            description="High-margin product with increasing conversion over the last 7 days."
            impact="+₹3,100/mo"
          />

          <Recommendation
            icon={<Users size={15} />}
            title="Cross-sell Sports Shorts"
            description="Customers buying running shoes are 3.2× more likely to buy these shorts."
            impact="+₹8,400/mo"
          />
        </div>

        <div className="catalog-panel opportunity-panel">
          <div className="panel-heading">
            <div className="heading-icon green">
              <TrendingUp size={16} />
            </div>

            <div>
              <span>CATALOG HEALTH</span>
              <strong>Overall performance</strong>
            </div>
          </div>

          <div className="health-score">
            <div>
              <strong>82</strong>
              <span>/100</span>
            </div>

            <div className="score-label">
              <span>Excellent</span>
              <p>Your catalog is performing above average.</p>
            </div>
          </div>

          <div className="health-bar">
            <div />
          </div>

          <div className="health-items">
            <Health label="Conversion" value="Good" positive />
            <Health label="Inventory" value="Good" positive />
            <Health label="Cross-sell" value="Needs attention" />
            <Health label="Pricing" value="Good" positive />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="catalog-stat">
      <div className="catalog-stat-top">
        <span>{label}</span>
        <div>{icon}</div>
      </div>

      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

function ProductRow({
  product,
}: {
  product: (typeof products)[number];
}) {
  const opportunity = product.status === "Opportunity";

  return (
    <div className="product-row">
      <div className="product-name">
        <div className="product-thumb">
          <Package size={17} />
        </div>

        <div>
          <strong>{product.name}</strong>
          <span>
            {product.sku} · {product.category}
          </span>
        </div>
      </div>

      <strong className="price">{product.price}</strong>

      <div
        className={
          product.stock < 50 ? "stock low-stock" : "stock"
        }
      >
        {product.stock}
      </div>

      <strong className="revenue">{product.revenue}</strong>

      <div className="conversion">
        <strong>{product.conversion}</strong>

        {opportunity ? (
          <TrendingDown size={12} />
        ) : (
          <TrendingUp size={12} />
        )}
      </div>

      <div>
        <span
          className={
            opportunity
              ? "performance opportunity"
              : "performance"
          }
        >
          {product.status}
        </span>

        <small
          className={opportunity ? "change negative" : "change"}
        >
          {product.change}
        </small>
      </div>

      <button className="more-button">
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}

function Recommendation({
  icon,
  title,
  description,
  impact,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  impact: string;
}) {
  return (
    <div className="recommendation-row">
      <div className="recommendation-icon">{icon}</div>

      <div className="recommendation-content">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <div className="recommendation-impact">
        <span>Potential</span>
        <strong>{impact}</strong>
      </div>

      <button className="arrow-button">
        <ArrowUpRight size={14} />
      </button>
    </div>
  );
}

function Health({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="health-item">
      <span>{label}</span>
      <strong className={positive ? "health-good" : "health-warning"}>
        {value}
      </strong>
    </div>
  );
}

export default Catalog;