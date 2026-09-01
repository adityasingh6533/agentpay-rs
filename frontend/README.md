# AgentPay Frontend

Frontend for the Razorpay Track 01 build: an AI revenue agent that recommends products, adds a cross-sell, gates every money action, and shows an audit trail.

## What To Demo

1. Start backend from `backend`:

   ```powershell
   cargo run
   ```

2. Start frontend from `frontend`:

   ```powershell
   npm start
   ```

   If port 3000 is busy:

   ```powershell
   $env:PORT=3001; npm start
   ```

3. Open `/agent`.

4. Click `Running bundle` or type:

   ```text
   I need running shoes under 1500
   ```

5. The agent should:

   - create a real backend session
   - understand customer intent
   - search the catalog
   - recommend `Velocity Running Shoes`
   - add `ProFit Running Socks` as a cross-sell
   - build a cart around `₹1,498`
   - wait before any payment action

6. Click `Authorize` using seeded merchant id:

   ```text
   40000000-0000-0000-0000-000000000001
   ```

7. If authorized, click `Create Razorpay Order`.

8. Open the audit section and show every recorded step.

## Confirmation Demo

Use:

```text
I need a sports jacket under 2000
```

This should create a higher-value cart around `₹1,899`, require customer confirmation, then allow execution only after `Confirm action`.

## Failure Demo

If Razorpay credentials or network access are unavailable, order creation fails safely. The backend keeps the signed intent bounded, releases reserved inventory, and records the failure in the audit trail.

## Why This Matches The Problem Statement

- `Problem Taste`: grows merchant revenue with recommendation plus cross-sell.
- `Build Quality`: Rust backend owns pricing, policy, inventory, signatures and Razorpay order creation.
- `AI Judgment`: LLM path exists, with deterministic fallback so the demo remains reliable.
- `Safety & Control`: checkout requires signed authorization and customer confirmation when policy says so.
- `Audit Trail`: every important agent and money action is visible.
- `Failure Recovery`: Razorpay/API failure is handled without silently completing payment.

## Environment

Backend `.env`:

```text
DATABASE_URL=postgres://...
AGENT_SIGNING_SECRET=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

Frontend `.env`:

```text
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_CUSTOMER_ID=demo-customer
REACT_APP_MERCHANT_ID=40000000-0000-0000-0000-000000000001
```

AI provider keys are optional for demo reliability because the backend has a deterministic commerce-agent fallback.

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
