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

/* =========================================================
   AGENT STATE MACHINE
   ========================================================= */

export type AgentStatus =
  | "IDLE"
  | "UNDERSTANDING"
  | "SEARCHING"
  | "DECIDING"
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

/* =========================================================
   HOOK OPTIONS
   ========================================================= */

interface UseAgentOptions {
  customerId: string;
}

/* =========================================================
   HOOK
   ========================================================= */

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

  const [error, setError] =
    useState<AgentError | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  /* =======================================================
     ERROR HANDLING
     ======================================================= */

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback(
    (err: unknown) => {
      console.error("Agent error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Agent operation failed.";

      setError({
        message,
      });

      setStatus("FAILED");
    },
    []
  );

  /* =======================================================
     SESSION
     ======================================================= */

  const startSession = useCallback(
    async () => {
      if (!customerId) {
        setError({
          message:
            "Customer identity is required to start an agent session.",
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

  /* =======================================================
     REFRESH SESSION
     ======================================================= */

  const refreshSession = useCallback(
    async () => {
      if (!session?.id) {
        return;
      }

      try {
        const updated =
          await api.agent.getSession(
            session.id
          );

        setSession(updated);

        if (updated.decision) {
          setDecision(
            updated.decision
          );
        }

        setCart(
          updated.decision?.cart ??
            null
        );

        setAuditTrail(
          updated.auditTrail
        );
      } catch (err) {
        handleError(err);
      }
    },
    [session?.id, handleError]
  );

  /* =======================================================
     SEND USER INTENT
     ======================================================= */

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) {
        return;
      }

      clearError();

      setIsLoading(true);

      try {
        /*
         * STEP 1
         * Ensure an agent session exists.
         */

        let activeSession = session;

        if (!activeSession) {
          activeSession =
            await api.agent.createSession(
              customerId
            );

          setSession(activeSession);
        }

        /*
         * STEP 2
         * Parse / register user intent.
         */

        setStatus("UNDERSTANDING");

        const createdIntent =
          await api.agent.createIntent({
            sessionId: activeSession.id,
            message: message.trim(),
          });

        setIntent(createdIntent);

        /*
         * STEP 3
         * Search catalog / generate recommendations.
         */

        setStatus("SEARCHING");

        const recommendationResponse =
          await api.agent.recommendations({
            sessionId:
              activeSession.id,

            intentId:
              createdIntent.id,
          });

        setRecommendations(
          recommendationResponse
            .recommendations
        );

        /*
         * STEP 4
         * Agent makes a decision.
         */

        setStatus("DECIDING");

        const createdDecision =
          await api.agent.createDecision({
            sessionId:
              activeSession.id,

            intentId:
              createdIntent.id,
          });

        setDecision(
          createdDecision
        );

        /*
         * STEP 5
         * Evaluate guardrails.
         *
         * IMPORTANT:
         * No money action is executed here.
         */

        setStatus("GUARDRAIL_CHECK");

        const guardrails =
          createdDecision.guardrails;

        const blocked =
          guardrails.some(
            (guard) =>
              guard.status ===
              "BLOCKED"
          );

        const reviewRequired =
          guardrails.some(
            (guard) =>
              guard.status ===
              "REVIEW_REQUIRED"
          );

        if (blocked) {
          setStatus("BLOCKED");
        } else if (reviewRequired) {
          setStatus(
            "REVIEW_REQUIRED"
          );
        } else if (
          createdDecision.requiresConfirmation
        ) {
          setStatus(
            "AWAITING_CONFIRMATION"
          );
        } else {
          /*
           * Even if policy passes,
           * money action is NOT
           * automatically executed.
           */
          setStatus(
            "AWAITING_CONFIRMATION"
          );
        }

        /*
         * Refresh audit/session state.
         */

        await refreshSession();

        return createdDecision;
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
      refreshSession,
    ]
  );

  /* =======================================================
     CUSTOMER CONFIRMATION
     ======================================================= */

  const confirmAction = useCallback(
    async () => {
      if (
        !session ||
        !decision
      ) {
        setError({
          message:
            "No pending agent decision is available.",
        });

        return null;
      }

      setIsLoading(true);
      clearError();

      try {
        /*
         * Authorization happens ONLY
         * after customer confirmation.
         */

        setStatus("AUTHORIZED");

        const action =
          await api.agent.authorizeAction({
            sessionId:
              session.id,

            decisionId:
              decision.id,

            type:
              "CREATE_ORDER",

            payload: {
              confirmation: true,
            },
          });

        setLastAction(action);

        /*
         * Backend may decide that
         * the action needs human review.
         */

        if (
          action.status ===
          "REVIEW_REQUIRED"
        ) {
          setStatus(
            "REVIEW_REQUIRED"
          );

          return action;
        }

        if (
          action.status ===
          "BLOCKED"
        ) {
          setStatus("BLOCKED");

          return action;
        }

        /*
         * Action is authorized.
         * Actual execution is a separate step.
         */

        return action;
      } catch (err) {
        handleError(err);

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      session,
      decision,
      clearError,
      handleError,
    ]
  );

  /* =======================================================
     EXECUTE AUTHORIZED ACTION
     ======================================================= */

  const executeAuthorizedAction =
    useCallback(async () => {
      if (!lastAction) {
        setError({
          message:
            "No authorized action is available.",
        });

        return null;
      }

      if (
        lastAction.status !==
        "AUTHORIZED"
      ) {
        setError({
          message:
            "Only an authorized action can be executed.",
        });

        return null;
      }

      setIsLoading(true);
      clearError();

      try {
        const executed =
          await api.agent.executeAction(
            lastAction.id
          );

        setLastAction(executed);

        if (
          executed.status ===
          "EXECUTED"
        ) {
          setStatus("CHECKOUT");
        }

        if (
          executed.status ===
          "REVIEW_REQUIRED"
        ) {
          setStatus(
            "REVIEW_REQUIRED"
          );
        }

        if (
          executed.status ===
          "BLOCKED"
        ) {
          setStatus("BLOCKED");
        }

        return executed;
      } catch (err) {
        handleError(err);

        return null;
      } finally {
        setIsLoading(false);
      }
    }, [
      lastAction,
      clearError,
      handleError,
    ]);

  /* =======================================================
     CART
     ======================================================= */

  const loadCart = useCallback(
    async () => {
      if (!session?.id) {
        return null;
      }

      try {
        const currentCart =
          await api.cart.get(
            session.id
          );

        setCart(currentCart);

        return currentCart;
      } catch (err) {
        handleError(err);

        return null;
      }
    },
    [session?.id, handleError]
  );

  const addProduct = useCallback(
    async (
      productId: string,
      quantity = 1
    ) => {
      if (!session?.id) {
        setError({
          message:
            "Start an agent session before modifying the cart.",
        });

        return null;
      }

      setIsLoading(true);
      clearError();

      try {
        const updatedCart =
          await api.cart.add({
            sessionId:
              session.id,

            productId,

            quantity,
          });

        setCart(updatedCart);

        return updatedCart;
      } catch (err) {
        handleError(err);

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      session?.id,
      clearError,
      handleError,
    ]
  );

  /* =======================================================
     POLICY
     ======================================================= */

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

  /* =======================================================
     AUDIT
     ======================================================= */

  const loadAuditTrail =
    useCallback(async () => {
      if (!session?.id) {
        return [];
      }

      try {
        const events =
          await api.agent.getAuditTrail(
            session.id
          );

        setAuditTrail(events);

        return events;
      } catch (err) {
        handleError(err);

        return [];
      }
    }, [
      session?.id,
      handleError,
    ]);

  /* =======================================================
     CHECKOUT
     ======================================================= */

  const createCheckout =
    useCallback(async () => {
      if (
        !session?.id ||
        !cart
      ) {
        setError({
          message:
            "A valid session and cart are required for checkout.",
        });

        return null;
      }

      if (
        status !== "AUTHORIZED" &&
        status !== "CHECKOUT"
      ) {
        setError({
          message:
            "Checkout requires an authorized agent action.",
        });

        return null;
      }

      setIsLoading(true);
      clearError();

      try {
        setStatus("CHECKOUT");

        const checkout =
          await api.checkout.create({
            sessionId:
              session.id,

            customerId,
          });

        return checkout;
      } catch (err) {
        handleError(err);

        return null;
      } finally {
        setIsLoading(false);
      }
    }, [
      session?.id,
      cart,
      status,
      customerId,
      clearError,
      handleError,
    ]);

  /* =======================================================
     RESET
     ======================================================= */

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

    setError(null);

    setIsLoading(false);
  }, []);

  /* =======================================================
     DERIVED STATE
     ======================================================= */

  const canConfirm =
    status ===
    "AWAITING_CONFIRMATION";

  const canExecute =
    status === "AUTHORIZED" &&
    lastAction?.status ===
      "AUTHORIZED";

  const needsReview =
    status ===
    "REVIEW_REQUIRED";

  const isBlocked =
    status === "BLOCKED";

  const isTerminal =
    status ===
      "COMPLETED" ||
    status === "FAILED" ||
    status === "BLOCKED";

  const currentRecommendation =
    useMemo(() => {
      return (
        decision?.recommendation ??
        recommendations[0] ??
        null
      );
    }, [
      decision,
      recommendations,
    ]);

  /* =======================================================
     PUBLIC API
     ======================================================= */

  return {
    // state
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

    // loading / error
    isLoading,
    error,

    // derived state
    canConfirm,
    canExecute,
    needsReview,
    isBlocked,
    isTerminal,

    // operations
    startSession,
    refreshSession,
    sendMessage,

    confirmAction,
    executeAuthorizedAction,

    loadCart,
    addProduct,

    loadSpendingLimits,
    loadAuditTrail,

    createCheckout,

    clearError,
    reset,
  };
}

export default useAgent;