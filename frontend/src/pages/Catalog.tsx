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
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import "../styles/Catalog.css";
import ProductCard from "../components/ProductCard";
import api from "../services/api";
import type {
  Product as ApiProduct,
} from "../types";

type Signal = "HIGH" | "MEDIUM" | "LOW";

type CatalogProduct = {
  id: number | string;
  name: string;
  category: string;
  description: string;
  price: number;
  rating: number;
  reviews: string;
  stock: number;
  conversion: number;
  crossSell: Signal;
  status: Signal;
  tag?: string;
  aiScore: number;
};

const fallbackProducts: CatalogProduct[] = [
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
  const [search, setSearch] =
    useState("");
  const [category, setCategory] =
    useState("All");
  const [
    showFilters,
    setShowFilters,
  ] = useState(false);
  const [aiOnly, setAiOnly] =
    useState(false);
  const [products, setProducts] =
    useState<CatalogProduct[]>(
      fallbackProducts
    );
  const [
    catalogSource,
    setCatalogSource,
  ] = useState<"API" | "DEMO">("DEMO");

  useEffect(() => {
    let mounted = true;

    api.catalog
      .listProducts({ limit: 50 })
      .then((items) => {
        if (!mounted || items.length === 0) {
          return;
        }

        setProducts(
          items.map(mapApiProduct)
        );
        setCatalogSource("API");
      })
      .catch(() => {
        if (mounted) {
          setProducts(fallbackProducts);
          setCatalogSource("DEMO");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          products.map(
            (product) =>
              product.category
          )
        )
      ),
    ],
    [products]
  );

  const filteredProducts =
    useMemo(() => {
      return products.filter(
        (product) => {
          const query =
            search.toLowerCase();
          const matchesSearch =
            product.name
              .toLowerCase()
              .includes(query) ||
            product.description
              .toLowerCase()
              .includes(query);
          const matchesCategory =
            category === "All" ||
            product.category ===
              category;
          const matchesAI =
            !aiOnly ||
            product.crossSell ===
              "HIGH";

          return (
            matchesSearch &&
            matchesCategory &&
            matchesAI
          );
        }
      );
    }, [
      products,
      search,
      category,
      aiOnly,
    ]);

  const aiProducts = products
    .filter(
      (product) =>
        product.aiScore >= 75
    )
    .slice(0, 3);

  return (
    <div className="catalog-page">
      <div className="catalog-header">
        <div>
          <div className="catalog-eyebrow">
            MERCHANT CATALOG
          </div>

          <div className="catalog-title-row">
            <div>
              <h1>Product Catalog</h1>

              <p>
                Backend catalog products optimized
                for AI buyers and cross-sell
                discovery.
              </p>
            </div>

            <button className="add-product-button">
              <Plus size={14} />
              Add product
            </button>
          </div>
        </div>
      </div>

      <div className="catalog-ai-banner">
        <div className="catalog-ai-icon">
          <Bot size={18} />
        </div>

        <div className="catalog-ai-content">
          <div>
            <span>
              AI CATALOG INSIGHT
            </span>

            <strong>
              {aiProducts.length} products are
              ready for agent selling
            </strong>
          </div>

          <p>
            Source: {catalogSource}. The running
            category has strong demand; bundling
            complementary products can lift average
            order value by an estimated 12-18%.
          </p>
        </div>

        <button>
          Review opportunities
          <ArrowUpRight size={13} />
        </button>
      </div>

      <div className="catalog-stats">
        <CatalogStat
          label="TOTAL PRODUCTS"
          value={`${products.length}`}
          icon={<Package size={16} />}
        />

        <CatalogStat
          label="IN STOCK"
          value={`${products.filter((p) => p.stock > 0).length}`}
          icon={<Zap size={16} />}
          green
        />

        <CatalogStat
          label="AI OPTIMIZED"
          value={`${products.filter((p) => p.aiScore >= 75).length}`}
          icon={<Sparkles size={16} />}
        />

        <CatalogStat
          label="GROWTH OPPORTUNITIES"
          value={`${products.filter((p) => p.crossSell === "HIGH").length}`}
          icon={<TrendingUp size={16} />}
        />
      </div>

      <div className="catalog-toolbar">
        <div className="catalog-search">
          <Search size={14} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search products..."
          />

          {search && (
            <button
              onClick={() =>
                setSearch("")
              }
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
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
            >
              {categories.map((item) => (
                <option key={item}>
                  {item}
                </option>
              ))}
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
              setAiOnly(
                (value) => !value
              )
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
              setShowFilters(
                (value) => !value
              )
            }
          >
            <Filter size={13} />
            Filters
          </button>
        </div>
      </div>

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

          {filteredProducts.map(
            (product) => (
              <ProductRow
                key={product.id}
                product={product}
              />
            )
          )}

          {filteredProducts.length ===
            0 && (
            <div className="catalog-empty">
              <Search size={22} />

              <strong>
                No products found
              </strong>

              <span>
                Try a different product
                name or category.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="catalog-preview-section">
        <div className="catalog-preview-header">
          <div>
            <span>
              AI PRODUCT INTELLIGENCE
            </span>

            <h2>
              Products your agent can
              recommend
            </h2>

            <p>
              These products have the
              strongest recommendation and
              bundling signals.
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
            />
          ))}
        </div>
      </div>

      <div className="catalog-opportunity">
        <div className="opportunity-icon">
          <TrendingUp size={17} />
        </div>

        <div>
          <span>
            AI GROWTH OPPORTUNITY
          </span>

          <strong>
            Velocity Running Shoes -&gt;
            ProFit Running Socks
          </strong>

          <p>
            Customers buying running shoes
            commonly need socks. Your agent
            can surface this cross-sell at
            checkout while keeping the money
            action gated.
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
  icon: ReactNode;
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
  product: CatalogProduct;
}) {
  return (
    <div className="catalog-table-row">
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

      <div className="catalog-price">
        {formatPrice(product.price)}
      </div>

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

      <div className="catalog-signal">
        <div
          className={`signal-badge ${product.status.toLowerCase()}`}
        >
          {product.status === "HIGH" && (
            <TrendingUp size={10} />
          )}

          {product.status ===
            "MEDIUM" && (
            <Sparkles size={10} />
          )}

          {product.status === "LOW" && (
            <AlertCircle size={10} />
          )}

          {product.crossSell}
        </div>
      </div>

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

function mapApiProduct(
  product: ApiProduct & {
    review_count?: number;
  }
): CatalogProduct {
  const price = Number(product.price);
  const stock =
    Number(product.stock || 0);
  const rating =
    Number(product.rating || 0);
  const reviews =
    product.reviewCount ??
    product.review_count ??
    0;
  const isStrong =
    rating >= 4.7 && stock > 0;
  const isLowStock = stock < 10;

  return {
    id: product.id,
    name: product.name,
    category:
      product.category || "General",
    description:
      product.description ||
      "Backend catalog product",
    price:
      Number.isFinite(price)
        ? price
        : 0,
    rating,
    reviews:
      Number(reviews).toLocaleString(
        "en-IN"
      ),
    stock,
    conversion: isStrong
      ? 8.7
      : isLowStock
      ? 3.2
      : 6.1,
    crossSell: isStrong
      ? "HIGH"
      : isLowStock
      ? "LOW"
      : "MEDIUM",
    status: isStrong
      ? "HIGH"
      : isLowStock
      ? "LOW"
      : "MEDIUM",
    tag: isStrong
      ? "AI PICK"
      : undefined,
    aiScore: isStrong
      ? 92
      : isLowStock
      ? 55
      : 76,
  };
}

function formatPrice(amount: number) {
  return `₹${amount.toLocaleString(
    "en-IN"
  )}`;
}

export default Catalog;
