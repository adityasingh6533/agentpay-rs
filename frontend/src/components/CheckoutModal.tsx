import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import "../styles/CheckoutModal.css";

import api from "../services/api";

import type {
  AgentAction,
  Cart,
  Checkout,
} from "../types";

type CheckoutModalProps = {
  open: boolean;
  sessionId?: string;
  customerId?: string;
  cart: Cart | null;
  action: AgentAction | null;

  onClose: () => void;

  onSuccess?: (
    checkout: Checkout
  ) => void;

  onBlocked?: (
    reason: string
  ) => void;
};

type CheckoutStep =
  | "REVIEW"
  | "CREATING_CHECKOUT"
  | "CREATING_ORDER"
  | "READY"
  | "FAILED";

function CheckoutModal({
  open,
  sessionId,
  customerId,
  cart,
  action,
  onClose,
  onSuccess,
  onBlocked,
}: CheckoutModalProps) {
  const [step, setStep] =
    useState<CheckoutStep>("REVIEW");

  const [razorpayOrderId, setRazorpayOrderId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  if (!open) {
    return null;
  }

  /*
   * IMPORTANT:
   *
   * Checkout cannot start without:
   *
   * 1. authenticated session
   * 2. cart
   * 3. authorized agent action
   */

  const canCheckout =
    Boolean(
      sessionId &&
      customerId &&
      cart &&
      action &&
      action.status === "AUTHORIZED"
    );

  const handleCreateCheckout =
    async () => {
      if (!sessionId || !customerId) {
        setError(
          "Customer session is missing."
        );

        setStep("FAILED");

        return;
      }

      if (!cart) {
        setError(
          "Cart is empty or unavailable."
        );

        setStep("FAILED");

        return;
      }

      if (!action) {
        setError(
          "No agent action is available."
        );

        setStep("FAILED");

        return;
      }

      /*
       * NEVER trust frontend state alone.
       *
       * Rust backend must independently verify
       * the action before creating payment.
       */

      if (
        action.status !==
        "AUTHORIZED"
      ) {
        const message =
          action.status ===
          "REVIEW_REQUIRED"
            ? "This transaction requires human review."
            : action.status ===
              "BLOCKED"
            ? "The agent action was blocked."
            : "The agent action is not authorized.";

        setError(message);

        onBlocked?.(message);

        setStep("FAILED");

        return;
      }

      setError(null);

      try {
        /*
         * STEP 1
         * Create internal checkout.
         */

        setStep(
          "CREATING_CHECKOUT"
        );

        const createdCheckout =
          await api.checkout.create({
            sessionId,
            customerId,
          });

        /*
         * STEP 2
         * Create Razorpay order.
         */

        setStep(
          "CREATING_ORDER"
        );

        const razorpayOrder =
          await api.checkout.createRazorpayOrder(
            createdCheckout.id
          );

        setRazorpayOrderId(
          razorpayOrder.razorpayOrderId
        );

        /*
         * IMPORTANT:
         *
         * We do NOT mark payment successful
         * here.
         *
         * Razorpay webhook/backend confirmation
         * will be the source of truth.
         */

        setStep("READY");

        onSuccess?.(
          createdCheckout
        );
      } catch (err) {
        console.error(
          "Checkout failed:",
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : "Unable to create checkout.";

        setError(message);

        setStep("FAILED");
      }
    };

  const handleClose = () => {
    if (
      step ===
        "CREATING_CHECKOUT" ||
      step ===
        "CREATING_ORDER"
    ) {
      return;
    }

    setStep("REVIEW");
    setError(null);

    onClose();
  };

  return (
    <div className="checkout-modal-overlay">
      <div className="checkout-modal">
        {/* HEADER */}

        <div className="checkout-modal-header">
          <div>
            <span>
              SECURE AGENT CHECKOUT
            </span>

            <h2>
              Complete transaction
            </h2>
          </div>

          <button
            className="checkout-close"
            onClick={handleClose}
            disabled={
              step ===
                "CREATING_CHECKOUT" ||
              step ===
                "CREATING_ORDER"
            }
          >
            <X size={16} />
          </button>
        </div>

        {/* SECURITY BAR */}

        <div className="checkout-security-bar">
          <ShieldCheck size={14} />

          <div>
            <strong>
              Agent authorization verified
            </strong>

            <span>
              Payment can only proceed after
              policy validation.
            </span>
          </div>

          <Check size={13} />
        </div>

        {/* CONTENT */}

        <div className="checkout-modal-body">
          {/* REVIEW */}

          {step === "REVIEW" && (
            <>
              <div className="checkout-section">
                <span className="checkout-label">
                  ORDER SUMMARY
                </span>

                {cart?.items.map(
                  (item) => (
                    <div
                      className="checkout-item"
                      key={item.productId}
                    >
                      <div>
                        <strong>
                          {item.productName}
                        </strong>

                        <span>
                          Qty: {item.quantity}
                        </span>
                      </div>

                      <strong>
                        ₹
                        {item.totalPrice.toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>
                  )
                )}
              </div>

              {/* TOTAL */}

              {cart && (
                <div className="checkout-total-box">
                  <div>
                    <span>
                      Subtotal
                    </span>

                    <strong>
                      ₹
                      {cart.subtotal.toLocaleString(
                        "en-IN"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Discount
                    </span>

                    <strong className="success">
                      {cart.discount > 0
                        ? `-₹${cart.discount.toLocaleString(
                            "en-IN"
                          )}`
                        : "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Delivery
                    </span>

                    <strong>
                      {cart.deliveryFee === 0
                        ? "FREE"
                        : `₹${cart.deliveryFee.toLocaleString(
                            "en-IN"
                          )}`}
                    </strong>
                  </div>

                  <div className="checkout-grand-total">
                    <span>
                      TOTAL
                    </span>

                    <strong>
                      ₹
                      {cart.total.toLocaleString(
                        "en-IN"
                      )}
                    </strong>
                  </div>
                </div>
              )}

              {/* AUTHORIZATION */}

              <div className="checkout-authorization">
                <div className="authorization-icon">
                  <Lock size={14} />
                </div>

                <div>
                  <span>
                    AUTHORIZATION STATUS
                  </span>

                  <strong>
                    {action?.status ??
                      "NOT AUTHORIZED"}
                  </strong>

                  <p>
                    This payment request is
                    bound to the agent decision
                    and customer-confirmed action.
                  </p>
                </div>
              </div>

              {/* ACTION */}

              <button
                className="checkout-primary-button"
                onClick={
                  handleCreateCheckout
                }
                disabled={!canCheckout}
              >
                <CreditCard size={15} />

                {canCheckout
                  ? "Create secure payment"
                  : "Authorization required"}

                <ArrowRight size={15} />
              </button>
            </>
          )}

          {/* CREATING CHECKOUT */}

          {step ===
            "CREATING_CHECKOUT" && (
            <ProcessingState
              title="Creating secure checkout"
              description="Validating the agent decision and creating an internal checkout."
            />
          )}

          {/* CREATING RAZORPAY ORDER */}

          {step ===
            "CREATING_ORDER" && (
            <ProcessingState
              title="Creating Razorpay order"
              description="The authorized checkout is being forwarded to Razorpay."
            />
          )}

          {/* READY */}

          {step === "READY" && (
            <div className="checkout-ready">
              <div className="checkout-ready-icon">
                <Check size={24} />
              </div>

              <span>
                CHECKOUT CREATED
              </span>

              <h3>
                Payment order ready
              </h3>

              <p>
                The backend created the
                Razorpay order successfully.
                Payment confirmation will be
                verified through the backend.
              </p>

              {razorpayOrderId && (
                <div className="order-id">
                  <span>
                    RAZORPAY ORDER
                  </span>

                  <strong>
                    {razorpayOrderId}
                  </strong>
                </div>
              )}

              <button
                className="checkout-primary-button"
                onClick={handleClose}
              >
                Continue
                <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* FAILED */}

          {step === "FAILED" && (
            <div className="checkout-failed">
              <div className="checkout-failed-icon">
                {action?.status ===
                "BLOCKED" ? (
                  <XCircle size={22} />
                ) : (
                  <AlertTriangle
                    size={22}
                  />
                )}
              </div>

              <span>
                CHECKOUT NOT CREATED
              </span>

              <h3>
                Transaction stopped
              </h3>

              <p>
                {error ??
                  "The transaction could not be processed."}
              </p>

              <button
                className="checkout-secondary-button"
                onClick={() => {
                  setStep("REVIEW");
                  setError(null);
                }}
              >
                Back to review
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}

        <div className="checkout-modal-footer">
          <div>
            <ShieldCheck size={11} />

            <span>
              Secure agent authorization
            </span>
          </div>

          <span>
            Razorpay
          </span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PROCESSING STATE
   ========================================================= */

function ProcessingState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="checkout-processing">
      <div className="processing-loader">
        <Loader2 size={25} />
      </div>

      <span>
        SECURE TRANSACTION
      </span>

      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>

      <div className="processing-security">
        <ShieldCheck size={12} />

        <span>
          No payment is considered successful
          until backend verification.
        </span>
      </div>
    </div>
  );
}

export default CheckoutModal;
