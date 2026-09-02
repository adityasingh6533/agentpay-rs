# AgentPay Frontend

AgentPay is a Razorpay Track 01 demo for AI Growth and Agentic Commerce. It shows a merchant revenue agent that reads a backend catalog, recommends relevant products, adds cross-sells, gates every money action, creates Razorpay test-mode orders, and records an audit trail.

## Winning Demo Script

1. Start backend:

   ```powershell
   cd backend
   cargo run
   ```

2. Start frontend:

   ```powershell
   cd frontend
   npm start
   ```

3. Open `/agent`.

4. Run growth flow:

   ```text
   I need running shoes under 1500
   ```

   Show:
   - relevant recommendation from backend catalog
   - cross-sell bundle
   - higher cart value
   - no payment action before authorization

5. Click `Authorize` with seeded merchant:

   ```text
   40000000-0000-0000-0000-000000000001
   ```

   Show:
   - signed intent
   - backend price calculation
   - policy decision
   - customer confirmation gate when required

6. Click `Confirm action`, then `Create Razorpay order`.

7. Open `/transactions`.

   Show the order created by the backend checkout pipeline.

8. Open `/dashboard`.

   Show backend-driven agent revenue, pipeline revenue, success rate, top products, and recent transactions.

9. Open `/guardrails`.

   Show policy limits, allowed categories, money-action gates, and failure demos.

10. Run failure flow:

   ```text
   I need a laptop under 40000
   ```

   Show the agent refuses checkout because the merchant does not sell laptops.

## Expanded Catalog Prompts

Use these after applying migrations:

```text
Find yoga gear under 1200
Recommend recovery tools under 900
I need gym clothes under 1500
Recommend running accessories under 500
I need a laptop under 40000
```

Expected behavior:
- yoga maps to Training
- recovery maps to Recovery
- gym clothes maps to Sportswear or Training
- running accessories maps to Accessories
- laptop stays out-of-catalog and cannot checkout

## Problem Statement Fit

- Problem Taste: grows merchant revenue through relevant recommendation and cross-sell.
- Build Quality: Rust backend owns pricing, policy, signatures, confirmation, inventory and Razorpay order creation.
- AI Judgment: LLM extraction is supported, with deterministic fallback for reliable demos.
- Safety and Control: every money action is bounded by policy and signed intent.
- Audit Trail: agent decisions, authorization, confirmation and checkout actions are logged.
- Failure Recovery: out-of-catalog, missing confirmation and payment failure paths stop safely.

## Backend APIs Used By Frontend

```text
GET  /api/catalog/products
GET  /api/catalog/products/:id
GET  /api/agent/catalog/:merchant_id
POST /api/agent/sessions
POST /api/agent/message
GET  /api/agent/sessions/:session_id/audit
GET  /api/policy/:merchant_id
POST /api/checkout/authorize
POST /api/checkout/confirmation
POST /api/checkout/execute
GET  /api/analytics/dashboard
GET  /api/transactions
```

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
```

Frontend `.env`:

```text
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_CUSTOMER_ID=demo-customer
REACT_APP_MERCHANT_ID=40000000-0000-0000-0000-000000000001
```

AI keys are optional for demo reliability because the backend has a deterministic commerce-agent fallback.

## Migration Note

The expanded catalog is in:

```text
backend/migrations/010_expand_demo_catalog.sql
```

If `cargo sqlx migrate run` reports an older migration checksum mismatch on your local database, create a fresh local database or repair the local migration history before applying migration 10. The committed migration is safe for clean environments.

## Checks

Run before submission:

```powershell
cd backend
cargo test
```

```powershell
cd frontend
npx.cmd tsc --noEmit
npm.cmd run build
```
