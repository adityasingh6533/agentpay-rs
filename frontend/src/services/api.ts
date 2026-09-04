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

export type AnalyticsTransaction = {
  id: string;
  customer_name: string;
  product_summary: string;
  amount: number;
  currency: string;
  status: string;
  razorpay_order_id?: string;
  agent_influenced: boolean;
  agent_action: string;
  created_at: string;
};

export type AnalyticsTopProduct = {
  id: string;
  name: string;
  category: string;
  revenue: number;
  orders: number;
  rating?: number;
  stock: number;
  growth_signal: "HIGH" | "MEDIUM" | "LOW";
};

export type DashboardAnalytics = {
  summary: {
    captured_revenue: number;
    pipeline_revenue: number;
    agent_revenue: number;
    total_checkouts: number;
    paid_checkouts: number;
    failed_checkouts: number;
    agent_checkouts: number;
    cross_sell_revenue: number;
    audit_events: number;
    success_rate: number;
  };
  recent_transactions: AnalyticsTransaction[];
  top_products: AnalyticsTopProduct[];
  growth: {
    aov_before: number;
    aov_after: number;
    aov_uplift_percent: number;
    cross_sell_attach_rate: number;
  };
};

export type PublicConfig = {
  razorpay_key_id: string;
};

/* =========================================================
   API CONFIG
   ========================================================= */

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";


/* =========================================================
   CLIENT
   ========================================================= */

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

const config = {
  async public(): Promise<PublicConfig> {
    const response =
      await client.get<PublicConfig>(
        "/config/public"
      );

    return response.data;
  },
};

/* =========================================================
   RESPONSE INTERCEPTOR
   ========================================================= */

client.interceptors.response.use(
  (response) => response,

  (error: AxiosError<any>) => {
    const message =
      getErrorMessage(
        error.response?.data
      ) ||
      error.message ||
      "Request failed.";

    return Promise.reject(new Error(message));
  }
);

/* =========================================================
   RESPONSE MAPPERS
   ========================================================= */

function getErrorMessage(data: unknown): string | null {
  if (!data) {
    return null;
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data !== "object") {
    return String(data);
  }

  const record =
    data as Record<string, unknown>;

  const directMessage =
    record.message;

  if (typeof directMessage === "string") {
    return directMessage;
  }

  const errorValue = record.error;

  if (typeof errorValue === "string") {
    return errorValue;
  }

  if (
    errorValue &&
    typeof errorValue === "object"
  ) {
    const nested =
      errorValue as Record<
        string,
        unknown
      >;

    if (
      typeof nested.message === "string"
    ) {
      return nested.message;
    }

    if (typeof nested.code === "string") {
      return nested.code;
    }
  }

  try {
    return JSON.stringify(data);
  } catch {
    return "Request failed.";
  }
}

function mapAgentSession(data: any): AgentSession {
  return {
    id: data.id,
    customerId: data.customer_id,
    status: data.status,
    auditTrail: [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function mapAuditEvent(data: any): AuditEvent {
  return {
    id: data.id,
    sessionId: data.session_id,
    eventType: data.event_type,
    actor: data.actor,
    status: data.status,
    message: data.message,
    metadata: data.metadata,
    createdAt: data.created_at,
  };
}

/* =========================================================
   AGENT API
   ========================================================= */

const agent = {
  async createSession(
    customerId: string
  ): Promise<AgentSession> {
    if (!customerId.trim()) {
      throw new Error("Customer ID is required.");
    }

    const response = await client.post<{
      session: any;
    }>("/agent/sessions", {
      customer_name: customerId.trim(),
    });

    return mapAgentSession(response.data.session);
  },

  async getSession(
    sessionId: string
  ): Promise<AgentSession> {
    const response =
      await client.get<any>(
        `/agent/sessions/${sessionId}`
      );

    return mapAgentSession(
      response.data.session ?? response.data
    );
  },

  async processMessage(payload: {
    session_id: string;
    message: string;
  }): Promise<{
    result: {
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
    };
  }> {
    const response =
      await client.post(
        "/agent/message",
        payload
      );

    return response.data;
  },

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

  async executeAction(
    actionId: string
  ): Promise<AgentAction> {
    const response =
      await client.post<AgentAction>(
        `/agent/actions/${actionId}/execute`
      );

    return response.data;
  },

  async getAuditTrail(
    sessionId: string
  ): Promise<AuditEvent[]> {
    const response =
      await client.get<any[]>(
        `/agent/sessions/${sessionId}/audit`
      );

    return response.data.map(mapAuditEvent);
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
        { params }
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

  async getAgentCatalog(
    merchantId: string
  ) {
    const response =
      await client.get(
        `/agent/catalog/${merchantId}`
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
      await client.get<any>(
        `/policy/${merchantId}`
      );

    return {
      id: response.data.id,
      merchantId:
        response.data.merchant_id,
      maxTransactionAmount:
        response.data
          .max_transaction_amount,
      dailyLimit:
        response.data
          .daily_transaction_limit,
      allowedCategories:
        response.data
          .allowed_categories || [],
      requiresConfirmationAbove:
        response.data
          .requires_confirmation_above,
      currency:
        response.data.currency ||
        "INR",
    };
  },
};

/* =========================================================
   CHECKOUT API
   ========================================================= */

const checkout = {
  async authorize(payload: {
    session_id: string;
    customer_id: string;
    merchant_id: string;
    product_ids: string[];

    /*
     * Sent only for API compatibility.
     * Backend MUST calculate trusted pricing
     * from PostgreSQL.
     */
    amount: number;

    currency: string;
    category: string;
  }): Promise<{
    intent_id: string;
    decision:
      | "AUTHORIZED"
      | "REVIEW"
      | "BLOCKED";
    reason: string;
    amount: number;
    currency: string;
    requires_confirmation: boolean;
  }> {
    const response =
      await client.post(
        "/checkout/authorize",
        payload
      );

    return response.data;
  },

  async requestConfirmation(payload: {
    intent_id: string;
    session_id: string;
  }) {
    const response =
      await client.post(
        "/checkout/confirmation",
        payload
      );

    return response.data;
  },

  async execute(payload: {
    session_id: string;
    intent_id: string;
    confirmation_token?: string;
  }) {
    const response =
      await client.post(
        "/checkout/execute",
        payload
      );

    return response.data;
  },

  async verifyPayment(payload: {
    session_id: string;
    intent_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<{
    status: string;
    intent_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    message: string;
  }> {
    const response =
      await client.post(
        "/checkout/verify-payment",
        payload
      );

    return response.data;
  },

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
   ANALYTICS API
   ========================================================= */

const analytics = {
  async dashboard(): Promise<DashboardAnalytics> {
    const response =
      await client.get<DashboardAnalytics>(
        "/analytics/dashboard"
      );

    return response.data;
  },

  async transactions(
    params?: {
      limit?: number;
    }
  ): Promise<AnalyticsTransaction[]> {
    const response =
      await client.get<
        AnalyticsTransaction[]
      >("/transactions", {
        params,
      });

    return response.data;
  },
};

/* =========================================================
   EXPORT
   ========================================================= */

const api = {
  config,
  agent,
  catalog,
  customer,
  cart,
  policy,
  checkout,
  analytics,
};

export default api;
