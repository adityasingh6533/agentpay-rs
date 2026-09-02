import {
  useCallback,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

import type {
  AgentAction,
  AgentDecision,
  AgentIntent,
  AgentSession,
  AuditEvent,
  Cart,
  Recommendation,
  SpendingLimits,
} from "../types";

export type AgentStatus =
  | "IDLE"
  | "UNDERSTANDING"
  | "SEARCHING"
  | "OUT_OF_CATALOG"
  | "DECIDING"
  | "READY_FOR_AUTHORIZATION"
  | "GUARDRAIL_CHECK"
  | "AWAITING_CONFIRMATION"
  | "AUTHORIZED"
  | "CHECKOUT"
  | "COMPLETED"
  | "REVIEW_REQUIRED"
  | "BLOCKED"
  | "FAILED";

export interface AgentError {
  message: string;
  code?: string;
}

export interface BackendAgentResult {
  message: string;
  intent: {
    category?: string;
    max_price?: number;
    keywords: string[];
    wants_recommendation: boolean;
    confidence: number;
  };
  recommendations: {
    product_id: string;
    product_name: string;
    price: number;
    score: number;
    reasons: string[];
  }[];
  cross_sell?: {
    product_id: string;
    product_name: string;
    price: number;
    confidence: number;
    support_count: number;
  };
}

type CheckoutAuthorizationResult = {
  intent_id: string;
  decision: "AUTHORIZED" | "REVIEW" | "BLOCKED";
  reason: string;
  requires_confirmation: boolean;
  amount: number;
  currency: string;
};

type CheckoutExecutionResult = {
  status: string;
  intent_id: string;
  razorpay_order_id?: string;
  amount?: number;
  currency?: string;
  message: string;
};

interface UseAgentOptions {
  customerId: string;
}

export function useAgent({
  customerId,
}: UseAgentOptions) {
  const [status, setStatus] =
    useState<AgentStatus>("IDLE");
  const [session, setSession] =
    useState<AgentSession | null>(null);
  const [intent, setIntent] =
    useState<AgentIntent | null>(null);
  const [decision, setDecision] =
    useState<AgentDecision | null>(null);
  const [recommendations, setRecommendations] =
    useState<Recommendation[]>([]);
  const [cart, setCart] =
    useState<Cart | null>(null);
  const [limits, setLimits] =
    useState<SpendingLimits | null>(null);
  const [lastAction, setLastAction] =
    useState<AgentAction | null>(null);
  const [auditTrail, setAuditTrail] =
    useState<AuditEvent[]>([]);
  const [agentResult, setAgentResult] =
    useState<BackendAgentResult | null>(null);
  const [authorization, setAuthorization] =
    useState<CheckoutAuthorizationResult | null>(null);
  const [confirmationToken, setConfirmationToken] =
    useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] =
    useState<CheckoutExecutionResult | null>(null);
  const [error, setError] =
    useState<AgentError | null>(null);
  const [isLoading, setIsLoading] =
    useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback(
    (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : "Agent operation failed.";

      setError({ message });
      setStatus("FAILED");
    },
    []
  );

  const loadAuditTrail = useCallback(
    async (sessionId = session?.id) => {
      if (!sessionId) {
        return [];
      }

      try {
        const events =
          await api.agent.getAuditTrail(
            sessionId
          );

        setAuditTrail(events);
        return events;
      } catch (err) {
        handleError(err);
        return [];
      }
    },
    [session?.id, handleError]
  );

  const startSession = useCallback(
    async () => {
      if (!customerId) {
        setError({
          message:
            "Customer identity is required.",
        });

        return null;
      }

      setIsLoading(true);
      clearError();

      try {
        const newSession =
          await api.agent.createSession(
            customerId
          );

        setSession(newSession);
        setStatus("IDLE");
        return newSession;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      customerId,
      clearError,
      handleError,
    ]
  );

  const sendMessage = useCallback(
    async (message: string) => {
      const trimmed = message.trim();

      if (!trimmed) {
        return null;
      }

      setIsLoading(true);
      clearError();
      setAuthorization(null);
      setConfirmationToken(null);
      setCheckoutResult(null);
      setLastAction(null);

      try {
        let activeSession = session;

        if (!activeSession) {
          activeSession =
            await api.agent.createSession(
              customerId
            );

          setSession(activeSession);
        }

        setStatus("UNDERSTANDING");
        setStatus("SEARCHING");

        const response =
          await api.agent.processMessage({
            session_id: activeSession.id,
            message: trimmed,
          });

        const result = response.result;
        const primary =
          result.recommendations[0];

        setAgentResult(result);

        const nextIntent: AgentIntent = {
          id: activeSession.id,
          sessionId: activeSession.id,
          message: trimmed,
          category: result.intent.category,
          budget: result.intent.max_price,
          confidence:
            result.intent.confidence,
          createdAt:
            new Date().toISOString(),
        };

        setIntent(nextIntent);

        const nextRecommendations =
          result.recommendations.map(
            (item) => ({
              product: {
                id: item.product_id,
                name: item.product_name,
                description:
                  item.reasons.join(" - "),
                category:
                  result.intent.category ||
                  "Commerce",
                price: item.price,
                currency: "INR",
                rating: 0,
                reviewCount: 0,
                stock: 0,
                active: true,
              },
              matchScore: item.score,
              reason:
                item.reasons.join(" - "),
            })
          );

        setRecommendations(
          nextRecommendations
        );

        if (!primary) {
          setDecision(null);
          setCart(null);
          setAuthorization(null);
          setStatus("OUT_OF_CATALOG");

          await loadAuditTrail(
            activeSession.id
          );

          return result;
        }

        const nextCart = buildCart(
          activeSession.id,
          result
        );
        const confidence = Math.round(
          result.intent.confidence * 100
        );

        const nextDecision: AgentDecision = {
          id: `decision-${activeSession.id}`,
          sessionId: activeSession.id,
          type:
            result.cross_sell
              ? "RECOMMEND_WITH_CROSS_SELL"
              : "RECOMMEND_PRODUCT",
          reasoning: buildReasoning(result),
          confidence,
          recommendation:
            nextRecommendations[0],
          cart: nextCart,
          guardrails: [
            {
              id: "recommendation-only",
              name:
                "Recommendation created without payment execution",
              status: "PASS",
            },
            {
              id: "server-pricing",
              name:
                "Checkout amount will be recalculated by backend",
              status: "PASS",
            },
            {
              id: "policy-required",
              name:
                "Money action requires merchant policy authorization",
              status: "REVIEW_REQUIRED",
            },
          ],
          requiresConfirmation: true,
          createdAt:
            new Date().toISOString(),
        };

        setCart(nextCart);
        setDecision(nextDecision);
        setStatus(
          "READY_FOR_AUTHORIZATION"
        );

        await loadAuditTrail(
          activeSession.id
        );

        return result;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      customerId,
      session,
      clearError,
      handleError,
      loadAuditTrail,
    ]
  );

  const authorizeCheckout =
    useCallback(
      async (merchantId: string) => {
        if (!session || !agentResult) {
          setError({
            message:
              "A valid agent session and recommendation are required.",
          });

          return null;
        }

        const productIds =
          getCheckoutProductIds(agentResult);

        if (productIds.length === 0) {
          setError({
            message:
              "No product is available for checkout.",
          });

          return null;
        }

        setIsLoading(true);
        clearError();
        setStatus("GUARDRAIL_CHECK");

        try {
          const result =
            await api.checkout.authorize({
              session_id: session.id,
              customer_id:
                session.customerId,
              merchant_id: merchantId,
              product_ids: productIds,
              amount: cart?.total || 0,
              currency:
                cart?.currency || "INR",
              category:
                agentResult.intent
                  .category || "GENERAL",
            });

          setAuthorization(result);
          setDecision((current) =>
            current
              ? {
                  ...current,
                  guardrails:
                    buildGuardrails(result),
                  requiresConfirmation:
                    result.requires_confirmation,
                }
              : current
          );

          if (
            result.decision === "BLOCKED"
          ) {
            setStatus("BLOCKED");
          } else if (
            result.decision === "REVIEW" ||
            result.requires_confirmation
          ) {
            setStatus(
              "AWAITING_CONFIRMATION"
            );
          } else {
            setStatus("AUTHORIZED");
          }

          await loadAuditTrail(session.id);
          return result;
        } catch (err) {
          handleError(err);
          return null;
        } finally {
          setIsLoading(false);
        }
      },
      [
        session,
        agentResult,
        cart,
        clearError,
        handleError,
        loadAuditTrail,
      ]
    );

  const confirmAction =
    useCallback(async () => {
      if (!session || !authorization) {
        setError({
          message:
            "No checkout authorization is available.",
        });

        return null;
      }

      if (
        authorization.decision ===
        "BLOCKED"
      ) {
        setStatus("BLOCKED");
        return null;
      }

      setIsLoading(true);
      clearError();

      try {
        const response =
          await api.checkout.requestConfirmation(
            {
              intent_id:
                authorization.intent_id,
              session_id: session.id,
            }
          );

        const token =
          extractConfirmationToken(
            response.status
          );

        if (!token) {
          throw new Error(
            "Confirmation token was not returned by the backend."
          );
        }

        setConfirmationToken(token);
        setAuthorization({
          ...authorization,
          decision: "AUTHORIZED",
          requires_confirmation: true,
        });
        setStatus("AUTHORIZED");

        await loadAuditTrail(session.id);
        return response;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [
      session,
      authorization,
      clearError,
      handleError,
      loadAuditTrail,
    ]);

  const executeCheckout =
    useCallback(async () => {
      if (!session || !authorization) {
        setError({
          message:
            "No authorized checkout is available.",
        });

        return null;
      }

      if (
        authorization.decision !==
        "AUTHORIZED"
      ) {
        setError({
          message:
            "Checkout has not been authorized.",
        });

        return null;
      }

      if (
        authorization.requires_confirmation &&
        !confirmationToken
      ) {
        setStatus(
          "AWAITING_CONFIRMATION"
        );
        setError({
          message:
            "Customer confirmation is required before checkout.",
        });

        return null;
      }

      setIsLoading(true);
      clearError();
      setStatus("CHECKOUT");

      try {
        const response =
          await api.checkout.execute({
            session_id: session.id,
            intent_id:
              authorization.intent_id,
            ...(confirmationToken
              ? {
                  confirmation_token:
                    confirmationToken,
                }
              : {}),
          });

        setCheckoutResult(response);
        setStatus("COMPLETED");
        await loadAuditTrail(session.id);
        return response;
      } catch (err) {
        await loadAuditTrail(session.id);
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [
      session,
      authorization,
      confirmationToken,
      clearError,
      handleError,
      loadAuditTrail,
    ]);

  const loadCart = useCallback(
    async () => cart,
    [cart]
  );

  const addProduct = useCallback(
    async () => {
      setError({
        message:
          "The demo cart is controlled by the agent recommendation.",
      });

      return cart;
    },
    [cart]
  );

  const loadSpendingLimits =
    useCallback(
      async (merchantId: string) => {
        try {
          const policy =
            await api.policy.get(
              merchantId
            );

          setLimits(policy);
          return policy;
        } catch (err) {
          handleError(err);
          return null;
        }
      },
      [handleError]
    );

  const reset = useCallback(() => {
    setStatus("IDLE");
    setSession(null);
    setIntent(null);
    setDecision(null);
    setRecommendations([]);
    setCart(null);
    setLimits(null);
    setLastAction(null);
    setAuditTrail([]);
    setAgentResult(null);
    setAuthorization(null);
    setConfirmationToken(null);
    setCheckoutResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const canConfirm =
    status === "AWAITING_CONFIRMATION" &&
    authorization !== null;

  const canExecute =
    status === "AUTHORIZED" &&
    authorization?.decision ===
      "AUTHORIZED";

  const needsReview =
    status === "REVIEW_REQUIRED";

  const isBlocked =
    status === "BLOCKED";

  const isTerminal =
    status === "COMPLETED" ||
    status === "FAILED" ||
    status === "BLOCKED" ||
    status === "OUT_OF_CATALOG";

  const currentRecommendation =
    useMemo(
      () =>
        recommendations[0] ?? null,
      [recommendations]
    );

  return {
    status,
    session,
    intent,
    decision,
    recommendations,
    currentRecommendation,
    cart,
    limits,
    lastAction,
    auditTrail,
    agentResult,
    authorization,
    confirmationToken,
    checkoutResult,
    isLoading,
    error,
    canConfirm,
    canExecute,
    needsReview,
    isBlocked,
    isTerminal,
    startSession,
    sendMessage,
    authorizeCheckout,
    confirmAction,
    executeCheckout,
    loadCart,
    addProduct,
    loadSpendingLimits,
    loadAuditTrail,
    clearError,
    reset,
  };
}

function buildCart(
  sessionId: string,
  result: BackendAgentResult
): Cart {
  const items = [
    ...result.recommendations
      .slice(0, 1)
      .map((item) => ({
        productId: item.product_id,
        productName:
          item.product_name,
        quantity: 1,
        unitPrice: item.price,
        totalPrice: item.price,
      })),
    ...(result.cross_sell
      ? [
          {
            productId:
              result.cross_sell
                .product_id,
            productName:
              result.cross_sell
                .product_name,
            quantity: 1,
            unitPrice:
              result.cross_sell.price,
            totalPrice:
              result.cross_sell.price,
          },
        ]
      : []),
  ];

  const subtotal = items.reduce(
    (total, item) =>
      total + item.totalPrice,
    0
  );

  return {
    id: `cart-${sessionId}`,
    sessionId,
    items,
    subtotal,
    discount: 0,
    deliveryFee: 0,
    total: subtotal,
    currency: "INR",
  };
}

function buildReasoning(
  result: BackendAgentResult
) {
  const primary =
    result.recommendations[0];

  if (!primary) {
    return result.message;
  }

  const reasons =
    primary.reasons.join(", ");

  if (result.cross_sell) {
    return `${primary.product_name} was selected because ${reasons}. ${result.cross_sell.product_name} is added as a cross-sell with ${Math.round(
      result.cross_sell.confidence * 100
    )}% affinity from historical product relationships.`;
  }

  return `${primary.product_name} was selected because ${reasons}.`;
}

function buildGuardrails(
  authorization: CheckoutAuthorizationResult
): AgentDecision["guardrails"] {
  if (
    authorization.decision === "BLOCKED"
  ) {
    return [
      {
        id: "merchant-policy",
        name: authorization.reason,
        status: "BLOCKED",
      },
    ];
  }

  return [
    {
      id: "signature",
      name:
        "Signed intent created and verified",
      status: "PASS",
    },
    {
      id: "policy",
      name:
        authorization.reason,
      status:
        authorization.decision ===
        "REVIEW"
          ? "REVIEW_REQUIRED"
          : "PASS",
    },
    {
      id: "human-gate",
      name:
        authorization.requires_confirmation
          ? "Customer confirmation required before execution"
          : "Amount is within no-confirmation policy limit",
      status:
        authorization.requires_confirmation
          ? "REVIEW_REQUIRED"
          : "PASS",
    },
  ];
}

function getCheckoutProductIds(
  result: BackendAgentResult
) {
  const ids = result.recommendations
    .slice(0, 1)
    .map((item) => item.product_id);

  if (result.cross_sell) {
    ids.push(
      result.cross_sell.product_id
    );
  }

  return ids;
}

function extractConfirmationToken(
  status: unknown
) {
  const value = String(status || "");
  const separator = value.indexOf(":");

  if (separator === -1) {
    return null;
  }

  return value.slice(separator + 1);
}

export default useAgent;
