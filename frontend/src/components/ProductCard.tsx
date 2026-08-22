import {
  Heart,
  Package,
  Plus,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import "../styles/ProductCard.css";

export type ProductCardData = {
  id: number | string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  rating?: number;
  reviews?: string | number;
  stock?: number;
  tag?: string;
  aiScore?: number;
  crossSell?: "HIGH" | "MEDIUM" | "LOW";
  selected?: boolean;
};

type ProductCardProps = {
  product: ProductCardData;
  variant?: "catalog" | "recommendation" | "compact";
  showAI?: boolean;
  showStock?: boolean;
  onAdd?: (product: ProductCardData) => void;
  onSelect?: (product: ProductCardData) => void;
};

function ProductCard({
  product,
  variant = "catalog",
  showAI = true,
  showStock = true,
  onAdd,
  onSelect,
}: ProductCardProps) {
  const [liked, setLiked] = useState(false);

  const handleAdd = () => {
    onAdd?.(product);
  };

  const handleSelect = () => {
    onSelect?.(product);
  };

  if (variant === "compact") {
    return (
      <div className="product-card compact-product-card">
        <div className="product-card-image compact-image">
          <Package size={24} />

          <button
            className={`product-heart ${
              liked ? "liked" : ""
            }`}
            onClick={() => setLiked((value) => !value)}
            aria-label="Toggle favorite"
          >
            <Heart
              size={12}
              fill={liked ? "currentColor" : "none"}
            />
          </button>
        </div>

        <div className="compact-product-info">
          <div>
            <strong>{product.name}</strong>

            {product.category && (
              <span>{product.category}</span>
            )}
          </div>

          <strong className="compact-price">
            {formatPrice(product.price)}
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`product-card ${
        variant === "recommendation"
          ? "recommendation-product-card"
          : ""
      }`}
    >
      {/* PRODUCT IMAGE */}

      <div className="product-card-image">
        <Package size={38} />

        <button
          className={`product-heart ${
            liked ? "liked" : ""
          }`}
          onClick={() => setLiked((value) => !value)}
          aria-label="Toggle favorite"
        >
          <Heart
            size={14}
            fill={liked ? "currentColor" : "none"}
          />
        </button>

        {product.tag && (
          <span className="product-tag">
            {product.tag}
          </span>
        )}
      </div>

      {/* PRODUCT INFO */}

      <div className="product-card-info">
        {/* CATEGORY */}

        {product.category && (
          <span className="product-category">
            {product.category}
          </span>
        )}

        {/* RATING */}

        {product.rating !== undefined && (
          <div className="product-rating">
            <Star
              size={10}
              fill="currentColor"
            />

            <strong>
              {product.rating}
            </strong>

            {product.reviews !== undefined && (
              <span>
                ({product.reviews})
              </span>
            )}
          </div>
        )}

        {/* NAME */}

        <h3>{product.name}</h3>

        {/* DESCRIPTION */}

        {product.description && (
          <p>{product.description}</p>
        )}

        {/* AI SIGNAL */}

        {showAI &&
          (product.aiScore !== undefined ||
            product.crossSell) && (
            <div className="product-ai-signal">
              <div className="ai-signal-icon">
                <Sparkles size={10} />
              </div>

              <div>
                <span>AI SIGNAL</span>

                <strong>
                  {product.aiScore !== undefined
                    ? `${product.aiScore}% match`
                    : `${product.crossSell} cross-sell`}
                </strong>
              </div>

              {product.crossSell === "HIGH" && (
                <TrendingUp
                  className="ai-trend"
                  size={11}
                />
              )}
            </div>
          )}

        {/* BOTTOM */}

        <div className="product-card-bottom">
          <div className="product-price">
            {formatPrice(product.price)}
          </div>

          {showStock &&
            product.stock !== undefined && (
              <div
                className={`product-stock ${
                  product.stock < 10
                    ? "low-stock"
                    : ""
                }`}
              >
                <span />
                {product.stock < 10
                  ? `${product.stock} left`
                  : "In stock"}
              </div>
            )}
        </div>

        {/* ACTION */}

        <button
          className="product-card-action"
          onClick={
            variant === "recommendation"
              ? handleSelect
              : handleAdd
          }
        >
          {variant === "recommendation" ? (
            <>
              <Sparkles size={12} />
              Select for customer
            </>
          ) : (
            <>
              <Plus size={13} />
              Add to catalog
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

export default ProductCard;