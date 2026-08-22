import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  ChevronDown,
  Edit3,
  Filter,
  Package,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import "../styles/Catalog.css";
import ProductCard from "../components/ProductCard";

type Product = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  rating: number;
  reviews: string;
  stock: number;
  conversion: number;
  crossSell: "HIGH" | "MEDIUM" | "LOW";
  status: "HIGH" | "MEDIUM" | "LOW";
  tag?: string;
  aiScore: number;
};

const products: Product[] = [
  {
    id: 1,
    name: "Velocity Running Shoes",
    category: "Running",
    description: "Lightweight daily running shoe",
    price: 1299,
    rating: 4.8,
    reviews: "2,340",
    stock: 42,
    conversion: 8.7,
    crossSell: "HIGH",
    status: "HIGH",
    tag: "TOP SELLER",
    aiScore: 94,
  },
  {
    id: 2,
    name: "ProFit Running Socks",
    category: "Accessories",
    description: "Performance socks for daily runs",
    price: 199,
    rating: 4.7,
    reviews: "1,820",
    stock: 86,
    conversion: 7.4,
    crossSell: "HIGH",
    status: "HIGH",
    tag: "AI PICK",
    aiScore: 91,
  },
  {
    id: 3,
    name: "Aero Sports Jacket",
    category: "Sportswear",
    description: "Breathable performance layer",
    price: 1899,
    rating: 4.7,
    reviews: "840",
    stock: 18,
    conversion: 5.8,
    crossSell: "MEDIUM",
    status: "MEDIUM",
    aiScore: 78,
  },
  {
    id: 4,
    name: "FlexRun Sports Shorts",
    category: "Sportswear",
    description: "Flexible training shorts",
    price: 899,
    rating: 4.6,
    reviews: "1,120",
    stock: 31,
    conversion: 6.9,
    crossSell: "MEDIUM",
    status: "MEDIUM",
    aiScore: 76,
  },
  {
    id: 5,
    name: "Sprint Performance Tee",
    category: "Sportswear",
    description: "Lightweight training performance tee",
    price: 699,
    rating: 4.5,
    reviews: "670",
    stock: 7,
    conversion: 3.2,
    crossSell: "LOW",
    status: "LOW",
    aiScore: 54,
  },
];

function Catalog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [aiOnly, setAiOnly] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        category === "All" ||
        product.category === category;

      const matchesAI =
        !aiOnly || product.crossSell === "HIGH";

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAI
      );
    });
  }, [search, category, aiOnly]);

  const aiProducts = products
    .filter((product) => product.aiScore >= 75)
    .slice(0, 3);

  return (
    <div className="catalog-page">
      {/* HEADER */}

      <div className="catalog-header">
        <div>
          <div className="catalog-eyebrow">
            MERCHANT CATALOG
          </div>

          <div className="catalog-title-row">
            <div>
              <h1>Product Catalog</h1>

              <p>
                Manage products and optimize them for AI buyers.
              </p>
            </div>

            <button className="add-product-button">
              <Plus size={14} />
              Add product
            </button>
          </div>
        </div>
      </div>

      {/* AI INSIGHT */}

      <div className="catalog-ai-banner">
        <div className="catalog-ai-icon">
          <Bot size={18} />
        </div>

        <div className="catalog-ai-content">
          <div>
            <span>AI CATALOG INSIGHT</span>

            <strong>
              3 products have growth opportunities
            </strong>
          </div>

          <p>
            Your running category has strong demand.
            Optimizing cross-sells could increase average
            order value by an estimated 12–18%.
          </p>
        </div>

        <button>
          Review opportunities
          <ArrowUpRight size={13} />
        </button>
      </div>

      {/* STATS */}

      <div className="catalog-stats">
        <CatalogStat
          label="TOTAL PRODUCTS"
          value="248"
          icon={<Package size={16} />}
        />

        <CatalogStat
          label="IN STOCK"
          value="231"
          icon={<Zap size={16} />}
          green
        />

        <CatalogStat
          label="AI OPTIMIZED"
          value="184"
          icon={<Sparkles size={16} />}
        />

        <CatalogStat
          label="GROWTH OPPORTUNITIES"
          value="12"
          icon={<TrendingUp size={16} />}
        />
      </div>

      {/* TOOLBAR */}

      <div className="catalog-toolbar">
        <div className="catalog-search">
          <Search size={14} />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search products..."
          />

          {search && (
            <button
              onClick={() => setSearch("")}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="catalog-toolbar-right">
          <div className="category-select">
            <span>Category</span>

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
            >
              <option>All</option>
              <option>Running</option>
              <option>Accessories</option>
              <option>Sportswear</option>
            </select>

            <ChevronDown size={12} />
          </div>

          <button
            className={
              aiOnly
                ? "filter-button active"
                : "filter-button"
            }
            onClick={() =>
              setAiOnly((value) => !value)
            }
          >
            <Sparkles size={13} />
            AI Opportunities
          </button>

          <button
            className={
              showFilters
                ? "filter-button active"
                : "filter-button"
            }
            onClick={() =>
              setShowFilters((value) => !value)
            }
          >
            <Filter size={13} />
            Filters
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}

      {showFilters && (
        <div className="catalog-filter-panel">
          <span>AI opportunity</span>

          <button
            onClick={() => {
              setAiOnly(true);
              setShowFilters(false);
            }}
          >
            High
          </button>

          <button>Medium</button>
          <button>Low</button>

          <div className="filter-spacer" />

          <button
            className="clear-filter"
            onClick={() =>
              setShowFilters(false)
            }
          >
            Close
          </button>
        </div>
      )}

      {/* TABLE */}

      <div className="catalog-table-card">
        <div className="catalog-table-header">
          <div>
            <span>PRODUCTS</span>

            <strong>
              {filteredProducts.length} products
            </strong>
          </div>

          <span className="catalog-sort">
            Sorted by AI opportunity
            <ChevronDown size={11} />
          </span>
        </div>

        <div className="catalog-table">
          <div className="catalog-table-row catalog-table-head">
            <span>PRODUCT</span>
            <span>PRICE</span>
            <span>STOCK</span>
            <span>CONVERSION</span>
            <span>AI SIGNAL</span>
            <span>ACTION</span>
          </div>

          {filteredProducts.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
            />
          ))}

          {filteredProducts.length === 0 && (
            <div className="catalog-empty">
              <Search size={22} />

              <strong>
                No products found
              </strong>

              <span>
                Try a different product name or category.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* AI RECOMMENDATION PREVIEW */}

      <div className="catalog-preview-section">
        <div className="catalog-preview-header">
          <div>
            <span>AI PRODUCT INTELLIGENCE</span>

            <h2>
              Products your agent can recommend
            </h2>

            <p>
              These products have the strongest AI
              recommendation signals.
            </p>
          </div>

          <div className="preview-ai-status">
            <Sparkles size={11} />
            Agent Ready
          </div>
        </div>

        <div className="catalog-product-preview-grid">
          {aiProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant="catalog"
              showAI
              showStock
              onAdd={(selectedProduct) => {
                console.log(
                  "Product selected:",
                  selectedProduct.name
                );
              }}
            />
          ))}
        </div>
      </div>

      {/* AI OPPORTUNITY */}

      <div className="catalog-opportunity">
        <div className="opportunity-icon">
          <TrendingUp size={17} />
        </div>

        <div>
          <span>AI GROWTH OPPORTUNITY</span>

          <strong>
            Velocity Running Shoes → ProFit Running Socks
          </strong>

          <p>
            68% of customers buying this shoe also purchase
            the socks. Your agent can automatically surface
            this recommendation during checkout.
          </p>
        </div>

        <button>
          Configure
          <ChevronDown size={12} />
        </button>
      </div>
    </div>
  );
}

function CatalogStat({
  label,
  value,
  icon,
  green = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  green?: boolean;
}) {
  return (
    <div className="catalog-stat">
      <div className="catalog-stat-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>

        <strong
          className={
            green ? "catalog-green" : ""
          }
        >
          {value}
        </strong>
      </div>
    </div>
  );
}

function ProductRow({
  product,
}: {
  product: Product;
}) {
  return (
    <div className="catalog-table-row">
      {/* PRODUCT */}

      <div className="catalog-product">
        <div className="catalog-product-image">
          <Package size={18} />
        </div>

        <div>
          <strong>{product.name}</strong>

          <span>
            {product.category}

            {product.tag && (
              <em>{product.tag}</em>
            )}
          </span>
        </div>
      </div>

      {/* PRICE */}

      <div className="catalog-price">
        ₹{product.price.toLocaleString("en-IN")}
      </div>

      {/* STOCK */}

      <div className="catalog-stock">
        <span
          className={
            product.stock < 10
              ? "stock-dot warning"
              : "stock-dot"
          }
        />

        <div>
          <strong>{product.stock}</strong>

          <span>
            {product.stock < 10
              ? "Low stock"
              : "In stock"}
          </span>
        </div>
      </div>

      {/* CONVERSION */}

      <div className="catalog-conversion">
        <strong>
          {product.conversion}%
        </strong>

        <div className="conversion-bar">
          <span
            style={{
              width: `${Math.min(
                product.conversion * 10,
                100
              )}%`,
            }}
          />
        </div>
      </div>

      {/* AI SIGNAL */}

      <div className="catalog-signal">
        <div
          className={`signal-badge ${product.status.toLowerCase()}`}
        >
          {product.status === "HIGH" && (
            <TrendingUp size={10} />
          )}

          {product.status === "MEDIUM" && (
            <Sparkles size={10} />
          )}

          {product.status === "LOW" && (
            <AlertCircle size={10} />
          )}

          {product.crossSell}
        </div>
      </div>

      {/* ACTION */}

      <div className="catalog-action">
        <button title="Edit product">
          <Edit3 size={13} />
        </button>

        <button title="AI optimize">
          <Sparkles size={13} />
        </button>
      </div>
    </div>
  );
}

export default Catalog;