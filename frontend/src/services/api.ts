import axios, {
  AxiosError,
  type AxiosInstance,
} from "axios";

import type {
  AddCartItemRequest,
  AgentAction,
  AgentDecision,
  AgentIntent,
  AgentSession,
  AuditEvent,
  AuthorizeActionRequest,
  Cart,
  CreateCheckoutRequest,
  CreateIntentRequest,
  Customer,
  DecisionRequest,
  Product,
  RazorpayOrder,
  Recommendation,
  RecommendationRequest,
  SpendingLimits,
  Checkout,
} from "../types";

/* =========================================================
   API CONFIG
   ========================================================= */

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  "http://localhost:3000/api";

/* =========================================================
   CLIENT
   ========================================================= */

const client: AxiosInstance =
  axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
      "Content-Type":
        "application/json",
    },
  });

/* =========================================================
   RESPONSE INTERCEPTOR
   ========================================================= */

client.interceptors.response.use(
  (response) =>
    response,

  (error: AxiosError<any>) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Request failed.";

    return Promise.reject(
      new Error(message)
    );
  }
);

/* =========================================================
   AGENT API
   ========================================================= */

const agent = {
  /* -----------------------------------------
     SESSION
  ----------------------------------------- */

  async createSession(
    customerId: string
  ): Promise<AgentSession> {
    const response =
      await client.post<AgentSession>(
        "/agent/sessions",
        {
          customerId,
        }
      );

    return response.data;
  },

  async getSession(
    sessionId: string
  ): Promise<AgentSession> {
    const response =
      await client.get<AgentSession>(
        `/agent/sessions/${sessionId}`
      );

    return response.data;
  },

  /* -----------------------------------------
     INTENT
  ----------------------------------------- */

  async createIntent(
    payload: CreateIntentRequest
  ): Promise<AgentIntent> {
    const response =
      await client.post<AgentIntent>(
        "/agent/intents",
        payload
      );

    return response.data;
  },

  /* -----------------------------------------
     RECOMMENDATIONS
  ----------------------------------------- */

  async recommendations(
    payload: RecommendationRequest
  ): Promise<{
    recommendations: Recommendation[];
  }> {
    const response =
      await client.post<{
        recommendations: Recommendation[];
      }>(
        "/agent/recommendations",
        payload
      );

    return response.data;
  },

  /* -----------------------------------------
     DECISION
  ----------------------------------------- */

  async createDecision(
    payload: DecisionRequest
  ): Promise<AgentDecision> {
    const response =
      await client.post<AgentDecision>(
        "/agent/decisions",
        payload
      );

    return response.data;
  },

  /* -----------------------------------------
     AUTHORIZE ACTION
  ----------------------------------------- */

  async authorizeAction(
    payload: AuthorizeActionRequest
  ): Promise<AgentAction> {
    const response =
      await client.post<AgentAction>(
        "/agent/actions/authorize",
        payload
      );

    return response.data;
  },

  /* -----------------------------------------
     EXECUTE ACTION
  ----------------------------------------- */

  async executeAction(
    actionId: string
  ): Promise<AgentAction> {
    const response =
      await client.post<AgentAction>(
        `/agent/actions/${actionId}/execute`
      );

    return response.data;
  },

  /* -----------------------------------------
     AUDIT
  ----------------------------------------- */

  async getAuditTrail(
    sessionId: string
  ): Promise<AuditEvent[]> {
    const response =
      await client.get<AuditEvent[]>(
        `/agent/sessions/${sessionId}/audit`
      );

    return response.data;
  },
};

/* =========================================================
   CATALOG API
   ========================================================= */

const catalog = {
  async listProducts(
    params?: {
      search?: string;
      category?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Product[]> {
    const response =
      await client.get<Product[]>(
        "/catalog/products",
        {
          params,
        }
      );

    return response.data;
  },

  async getProduct(
    productId: string
  ): Promise<Product> {
    const response =
      await client.get<Product>(
        `/catalog/products/${productId}`
      );

    return response.data;
  },
};

/* =========================================================
   CUSTOMER API
   ========================================================= */

const customer = {
  async get(
    customerId: string
  ): Promise<Customer> {
    const response =
      await client.get<Customer>(
        `/customers/${customerId}`
      );

    return response.data;
  },
};

/* =========================================================
   CART API
   ========================================================= */

const cart = {
  async get(
    sessionId: string
  ): Promise<Cart> {
    const response =
      await client.get<Cart>(
        `/cart/${sessionId}`
      );

    return response.data;
  },

  async add(
    payload: AddCartItemRequest
  ): Promise<Cart> {
    const response =
      await client.post<Cart>(
        "/cart/items",
        payload
      );

    return response.data;
  },

  async remove(
    sessionId: string,
    productId: string
  ): Promise<Cart> {
    const response =
      await client.delete<Cart>(
        `/cart/${sessionId}/items/${productId}`
      );

    return response.data;
  },
};

/* =========================================================
   POLICY API
   ========================================================= */

const policy = {
  async get(
    merchantId: string
  ): Promise<SpendingLimits> {
    const response =
      await client.get<SpendingLimits>(
        `/policy/${merchantId}`
      );

    return response.data;
  },
};

/* =========================================================
   CHECKOUT API
   ========================================================= */

const checkout = {
  async create(
    payload: CreateCheckoutRequest
  ): Promise<Checkout> {
    const response =
      await client.post<Checkout>(
        "/checkout",
        payload
      );

    return response.data;
  },

  async createRazorpayOrder(
    checkoutId: string
  ): Promise<RazorpayOrder> {
    const response =
      await client.post<RazorpayOrder>(
        `/checkout/${checkoutId}/razorpay-order`
      );

    return response.data;
  },

  async get(
    checkoutId: string
  ): Promise<Checkout> {
    const response =
      await client.get<Checkout>(
        `/checkout/${checkoutId}`
      );

    return response.data;
  },
};

/* =========================================================
   EXPORT
   ========================================================= */

const api = {
  agent,
  catalog,
  customer,
  cart,
  policy,
  checkout,
};

export default api;