import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Package,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import "../styles/RecommendationCard.css"

export type RecommendationData = {
  productName: string;
  description: string;
  price: number;
  rating: number;
  reviews: string;
  matchScore: number;
  reason: string;
  crossSell?: {
    name: string;
    price: number;
    reason: string;
  };
  expectedAOV?: number;
  tag?: string;
};

type RecommendationCardProps = {
  recommendation: RecommendationData;
  onSelect?: () => void;
  onAddCrossSell?: () => void;
};

function RecommendationCard({
  recommendation,
  onSelect,
  onAddCrossSell,
}: RecommendationCardProps) {
  return (
    <div className="recommendation-card">
      {/* HEADER */}

      <div className="recommendation-card-header">
        <div className="recommendation-agent">
          <div className="recommendation-agent-icon">
            <Bot size={13} />
          </div>

          <div>
            <span>AGENT RECOMMENDATION</span>
            <strong>Best match for customer</strong>
          </div>
        </div>

        <div className="recommendation-confidence">
          <Sparkles size={10} />
          {recommendation.matchScore}% MATCH
        </div>
      </div>

      {/* PRODUCT */}

      <div className="recommendation-product">
        <div className="recommendation-product-image">
          <Package size={32} />

          {recommendation.tag && (
            <span>{recommendation.tag}</span>
          )}
        </div>

        <div className="recommendation-product-info">
          <span className="recommendation-product-label">
            PRIMARY RECOMMENDATION
          </span>

          <h3>{recommendation.productName}</h3>

          <p>{recommendation.description}</p>

          <div className="recommendation-rating">
            <span>★</span>

            <strong>
              {recommendation.rating}
            </strong>

            <span className="reviews">
              ({recommendation.reviews} reviews)
            </span>
          </div>

          <strong className="recommendation-product-price">
            ₹{recommendation.price.toLocaleString("en-IN")}
          </strong>
        </div>
      </div>

      {/* WHY */}

      <div className="recommendation-reason">
        <div className="reason-icon">
          <Sparkles size={12} />
        </div>

        <div>
          <span>WHY THE AGENT CHOSE THIS</span>

          <p>{recommendation.reason}</p>
        </div>
      </div>

      {/* CROSS SELL */}

      {recommendation.crossSell && (
        <div className="recommendation-crosssell">
          <div className="crosssell-left">
            <div className="crosssell-icon">
              <TrendingUp size={12} />
            </div>

            <div>
              <span>SMART CROSS-SELL</span>

              <strong>
                {recommendation.crossSell.name}
              </strong>

              <p>
                {recommendation.crossSell.reason}
              </p>
            </div>
          </div>

          <div className="crosssell-action">
            <strong>
              ₹
              {recommendation.crossSell.price.toLocaleString(
                "en-IN"
              )}
            </strong>

            <button onClick={onAddCrossSell}>
              Add
              <PlusIcon />
            </button>
          </div>
        </div>
      )}

      {/* DECISION METRICS */}

      <div className="recommendation-metrics">
        <Metric
          label="MATCH"
          value={`${recommendation.matchScore}%`}
        />

        <Metric
          label="EXPECTED AOV"
          value={
            recommendation.expectedAOV
              ? `₹${recommendation.expectedAOV.toLocaleString(
                  "en-IN"
                )}`
              : "—"
          }
        />

        <Metric
          label="POLICY"
          value="PASS"
          success
        />
      </div>

      {/* ACTION */}

      <div className="recommendation-actions">
        <button
          className="recommendation-select"
          onClick={onSelect}
        >
          <Check size={13} />
          Select recommendation
          <ArrowRight size={13} />
        </button>

        <button className="recommendation-details">
          Details
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  success = false,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="recommendation-metric">
      <span>{label}</span>

      <strong
        className={success ? "metric-success" : ""}
      >
        {success && <Check size={9} />}
        {value}
      </strong>
    </div>
  );
}

function PlusIcon() {
  return (
    <span className="plus-icon">
      +
    </span>
  );
}

export default RecommendationCard;