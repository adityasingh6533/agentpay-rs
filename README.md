# AgentPay

AgentPay is an AI Growth and Agentic Commerce project for Razorpay Track 01.

It is a merchant revenue agent that can understand a customer shopping request, search a backend product catalog, recommend relevant products, add a cross-sell to increase order value, gate every money action through policy and customer confirmation, create a Razorpay test-mode order, and show the audit trail for what happened and why.

## Problem Statement

Track 01 asks builders to create an agent that either:

- grows a merchant's revenue using Razorpay test-mode APIs, or
- makes a merchant transactable by an AI buyer end to end.

AgentPay does both:

- It grows revenue by recommending relevant products and adding cross-sells.
- It makes the merchant catalog readable to agents through backend catalog APIs.
- It makes checkout transactable through signed intents, policy checks, customer confirmation, and Razorpay test-mode order creation.

## STAR Method

### Situation

Merchants want AI agents to sell for them, but agentic commerce has a trust problem. An AI buyer should not be allowed to randomly pick products, invent prices, skip customer approval, or trigger payment without guardrails.

The hackathon bar specifically requires:

- every money action must be explainable
- every money action must be bounded
- every money action must be gated
- the audit trail must be visible
- at least one failure mode must be handled gracefully

### Task

Build a working merchant commerce agent that can:

- understand natural-language customer intent
- search a real merchant catalog
- recommend relevant products
- increase merchant revenue through cross-sell
- authorize checkout safely
- require customer confirmation when policy says so
- create a Razorpay test-mode order
- record audit events
- reject unsupported requests instead of making unsafe recommendations

### Action

AgentPay implements the flow across a Rust backend and React frontend.

Backend actions:

- Stores products, customers, sessions, carts, checkouts, audit events, policies, signed intents, and inventory reservations in PostgreSQL.
- Exposes a machine-readable product catalog.
- Extracts customer shopping intent using a cost-safe deterministic path by default, with an optional LLM path for live AI demos.
- Ranks products using category relevance, keywords, price fit, ratings, reviews, and stock.
- Blocks unrelated recommendations, so a request like `I need a laptop under 40000` does not return sportswear.
- Adds cross-sell products using product relationship signals.
- Recalculates checkout pricing on the backend.
- Evaluates merchant policy before money actions.
- Signs agent intents with HMAC.
- Requires customer confirmation above the configured threshold.
- Creates Razorpay test-mode orders only after authorization and confirmation pass.
- Handles payment success/failure webhooks and inventory reservation cleanup.

Frontend actions:

- Shows a backend-driven dashboard.
- Shows backend catalog products.
- Shows backend checkout transactions.
- Shows an AI Agent page with the full guided flow.
- Shows a Guardrails page with policy limits, failure demos, and money-action gates.
- Shows audit events for the agent session.
- Shows out-of-catalog failures as controlled safety outcomes, not crashes.

### Result

AgentPay now demonstrates a complete judge-ready flow:

- Customer asks for running shoes under Rs 1500.
- Agent recommends a relevant product from the backend catalog.
- Agent adds a cross-sell to increase cart value.
- Checkout remains locked until authorization.
- Backend verifies price, category, merchant policy, and signed intent.
- Customer confirmation is required when amount crosses policy threshold.
- Razorpay test-mode order is created after confirmation.
- Frontend opens Razorpay Checkout with that backend-created order ID.
- Payment success/failure is shown explicitly; the frontend success handler sends the Razorpay signature back to the backend for final paid reconciliation.
- Dashboard and transactions update from backend data.
- Audit trail shows what the agent did and why.
- Unsupported products are blocked safely.

## Core Demo Flow

Start backend:

```powershell
cd backend
cargo run
```

Start frontend:

```powershell
cd frontend
npm start
```

Open:

```text
http://localhost:3000/agent
```

Run this prompt:

```text
I need running shoes under 1500
```

Show:

- backend session created
- intent extracted
- relevant catalog product selected
- cross-sell added
- cart value increased
- checkout locked before authorization

Then click:

```text
Authorize
Confirm action
Create Razorpay order
Pay with Razorpay
```

Show:

- signed intent
- policy decision
- confirmation gate
- Razorpay order ID
- Razorpay Checkout popup
- payment ID after successful test payment
- audit events
- transaction in `/transactions`
- revenue metrics in `/`

## Failure Demo

Run:

```text
I need a laptop under 40000
```

Expected result:

- no product recommendation
- no authorization button for checkout
- state becomes out-of-catalog
- audit trail records why checkout was stopped

This proves the agent knows when not to transact.

## Expanded Catalog Prompts

After migrations are applied, these prompts should work:

```text
Find yoga gear under 1200
Recommend recovery tools under 900
I need gym clothes under 1500
Recommend running accessories under 500
I need a laptop under 40000
```

Expected mapping:

- yoga gear -> Training
- recovery tools -> Recovery
- gym clothes -> Training or Sportswear
- running accessories -> Accessories
- laptop -> out-of-catalog

## Product Capabilities

### AI Revenue Agent

The agent:

- understands customer request
- searches backend catalog
- ranks products
- explains recommendation reasons
- adds cross-sell when available
- creates a cart preview
- waits for checkout authorization

### Merchant Dashboard

The dashboard is backend-driven and shows:

- pipeline revenue
- agent revenue
- checkout count
- success rate
- AOV uplift
- cross-sell revenue
- top products
- recent transactions

### Catalog

The catalog page uses backend products from:

```text
GET /api/catalog/products
```

The expanded catalog includes running, sportswear, accessories, training, and recovery products.

### Transactions

The transactions page uses backend checkout data from:

```text
GET /api/transactions
```

It shows actual orders created by the backend checkout pipeline.

### Guardrails

The Guardrails page shows:

- max transaction amount
- daily customer cap
- confirmation threshold
- allowed categories
- intent extraction gate
- catalog relevance gate
- policy authorization gate
- Razorpay execution gate
- failure demo center

### Agent-Readable Catalog

The project exposes catalog information for AI buyers through:

```text
GET /api/agent/catalog/:merchant_id
```

This includes products, prices, stock, availability, and checkout capability metadata.

## Architecture

```text
Customer / Judge
      |
      v
React Frontend
      |
      v
Rust Axum Backend
      |
      +--> PostgreSQL
      |      - products
      |      - customers
      |      - agent sessions
      |      - decisions
      |      - signed intents
      |      - checkouts
      |      - audit events
      |      - inventory reservations
      |
      +--> Agent Orchestrator
      |      - intent extraction
      |      - catalog ranking
      |      - cross-sell selection
      |      - out-of-catalog blocking
      |
      +--> Policy Engine
      |      - category allowlist
      |      - transaction cap
      |      - daily cap
      |      - confirmation threshold
      |
      +--> Razorpay Test Mode
             - order creation
             - webhook reconciliation
```

## Safety Model

AgentPay does not trust frontend money data.

Before checkout:

1. Backend fetches product IDs from the signed intent.
2. Backend recalculates amount from PostgreSQL products.
3. Backend checks stock and active product status.
4. Backend checks merchant spending policy.
5. Backend signs the intent.
6. Backend stores authorization attempt.
7. Backend requires confirmation when policy says review is needed.
8. Backend creates the Razorpay order only after gates pass.

## Merchant Policy

Seeded merchant ID:

```text
40000000-0000-0000-0000-000000000001
```

Default policy:

```text
Max transaction: Rs 5000
Daily customer cap: Rs 20000
Confirmation above: Rs 1500
Allowed categories: Running, Accessories, Sportswear, Training, Recovery
Currency: INR
```

## Backend APIs

```text
GET  /api/health
GET  /api/catalog/products
GET  /api/catalog/products/:product_id
GET  /api/agent/catalog/:merchant_id
GET  /api/policy/:merchant_id
GET  /api/analytics/dashboard
GET  /api/transactions

POST /api/agent/sessions
POST /api/agent/message
GET  /api/agent/sessions/:session_id/audit

POST /api/checkout/authorize
POST /api/checkout/confirmation
POST /api/checkout/execute

POST /api/webhooks/razorpay
```

## Tech Stack

Backend:

- Rust
- Axum
- Tokio
- SQLx
- PostgreSQL
- HMAC/SHA2 signed intents
- Razorpay test-mode orders

Frontend:

- React
- TypeScript
- React Router
- Axios
- Lucide icons

## Environment

Backend `.env`:

```text
DATABASE_URL=postgres://...
AGENT_SIGNING_SECRET=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
AI_API_KEY=...
AI_BASE_URL=...
AI_MODEL=...
AI_PROVIDER_ENABLED=false
```

Keep `AI_PROVIDER_ENABLED=false` while rehearsing the pitch to avoid spending OpenAI credits. Set it to `true` only when you intentionally want live LLM intent extraction; otherwise the deterministic commerce parser gives stable demo behavior.

Frontend `.env`:

```text
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_CUSTOMER_ID=demo-customer
REACT_APP_MERCHANT_ID=40000000-0000-0000-0000-000000000001
```

Do not commit `.env`.

## Database Setup

Run migrations:

```powershell
cd backend
cargo sqlx migrate run
```

The expanded demo catalog is migration:

```text
backend/migrations/010_expand_demo_catalog.sql
```

If a local database reports a checksum mismatch for an older migration, use a fresh local database or repair the local migration history. Clean environments should apply all migrations normally.

## Verification

Backend:

```powershell
cd backend
cargo test
```

Frontend:

```powershell
cd frontend
npx.cmd tsc --noEmit
```

Optional production build:

```powershell
cd frontend
npm.cmd run build
```

## Current Proof Status

Already implemented:

- backend-driven catalog
- backend-driven dashboard
- backend-driven transactions
- AI agent recommendation flow
- cross-sell flow
- signed intent authorization
- customer confirmation gate
- Razorpay test-mode order creation
- frontend Razorpay Checkout popup
- audit trail
- out-of-catalog failure handling
- payment success/failure tests
- inventory reservation tests
- webhook idempotency tests
- expanded catalog migration

Still useful for final polish:

- deployment or Docker Compose
- demo video
- screenshots
- final visual QA on multiple screen sizes
- more merchant catalog screenshots in submission

## Why This Can Win

The project is not just a chatbot. It is a commerce control plane:

- AI decides what to recommend.
- Backend decides what is allowed.
- Customer confirms risky actions.
- Razorpay executes only after approval.
- Audit trail explains everything.

That directly matches the Track 01 bar: grow revenue, make the merchant sellable to AI buyers, and keep every money action explainable, bounded and gated.
