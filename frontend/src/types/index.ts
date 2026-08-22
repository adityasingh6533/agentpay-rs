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

export type GuardrailStatus =
  | "PASS"
  | "BLOCKED"
  | "REVIEW_REQUIRED";

export type ActionStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "EXECUTED"
  | "REVIEW_REQUIRED"
  | "BLOCKED"
  | "FAILED";

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  stock: number;
  active: boolean;
  metadata?: Record<string, unknown>;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentIntent {
  id: string;
  sessionId: string;
  message: string;
  category?: string;
  budget?: number;
  currency?: string;
  confidence: number;
  createdAt: string;
}

export interface Recommendation {
  product: Product;
  matchScore: number;
  reason: string;
}

export interface Guardrail {
  id: string;
  name: string;
  status: GuardrailStatus;
  reason?: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Cart {
  id: string;
  sessionId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  currency: string;
}

export interface AgentDecision {
  id: string;
  sessionId: string;
  type: string;
  reasoning: string;
  confidence: number;
  recommendation?: Recommendation;
  cart: Cart | null;
  guardrails: Guardrail[];
  requiresConfirmation: boolean;
  createdAt: string;
}

export interface AgentAction {
  id: string;
  sessionId: string;
  decisionId: string;
  type: string;
  status: ActionStatus;
  payload: Record<string, unknown>;
  signature?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface SpendingLimits {
  id: string;
  merchantId: string;
  maxTransactionAmount: number;
  dailyLimit: number;
  allowedCategories: string[];
  requiresConfirmationAbove: number;
  currency: string;
}

export interface AuditEvent {
  id: string;
  sessionId: string;
  eventType: string;
  actor: "CUSTOMER" | "AGENT" | "SYSTEM" | "MERCHANT";
  status: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AgentSession {
  id: string;
  customerId: string;
  status: AgentStatus;
  decision?: AgentDecision;
  auditTrail: AuditEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Checkout {
  id: string;
  sessionId: string;
  customerId: string;
  cartId: string;
  amount: number;
  currency: string;
  status:
    | "CREATED"
    | "PENDING"
    | "PAID"
    | "FAILED"
    | "CANCELLED";
  createdAt: string;
}

export interface RazorpayOrder {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface CreateIntentRequest {
  sessionId: string;
  message: string;
}

export interface RecommendationRequest {
  sessionId: string;
  intentId: string;
}

export interface DecisionRequest {
  sessionId: string;
  intentId: string;
}

export interface AuthorizeActionRequest {
  sessionId: string;
  decisionId: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface AddCartItemRequest {
  sessionId: string;
  productId: string;
  quantity: number;
}

export interface CreateCheckoutRequest {
  sessionId: string;
  customerId: string;
}