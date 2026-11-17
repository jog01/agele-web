# Gasless swaps

The terminal requests a server quote before review, creates an unsigned transaction when the user confirms, and asks Privy's embedded Solana wallet to sign it. The frontend never broadcasts the transaction: the API sponsors and submits it. Amounts sent to the API are base-unit strings; token precision comes from `Token.decimals`, and USDC uses six decimals.

## Quote, sign and submit

```mermaid
sequenceDiagram
  actor U as User
  participant T as Order ticket
  participant A as Agele API
  participant P as Privy embedded wallet
  U->>T: Enter buy / sell amount
  T->>T: Validate precision, debounce 350ms
  T->>A: GET /v1/swaps/quote?inputMint&outputMint&amount&slippageBps
  A-->>T: Quote (base-unit amounts, impact, fee)
  T-->>U: Review server quote; network fee Sponsored
  U->>T: Confirm (signed out → prompt sign-in)
  T->>A: POST /v1/swaps (Bearer token)
  A-->>T: requestId, unsigned base64 transaction, expiresAt
  opt Already expired before signing
    T->>A: POST /v1/swaps again
    A-->>T: Fresh requestId and transaction
  end
  T->>P: signTransaction(Uint8Array, wallet, chain)
  P-->>T: signedTransaction (Uint8Array)
  T->>A: POST /v1/swaps/{requestId}/submit (base64 signedTransaction)
  A-->>T: signature, confirmed / failed / submitted
  loop Only while submitted; up to 40 polls, 1.5s apart
    T->>A: GET /v1/swaps/{requestId} (Bearer token)
    A-->>T: status, signature?, error?
  end
  alt Confirmed
    T-->>U: Success toast with View on Solscan action
  else Failed / expired
    T-->>U: Error / fresh quote required
  else Still submitted after polling limit
    T-->>U: Still pending; check explorer before retrying
  end
```

`lib/swaps.ts` contains the injected orchestration and typed API adapter; `hooks/use-swap.ts` owns quotes and execution state. `hooks/use-swap-signer.ts` uses Privy 3.51.4's `useSignTransaction` and `useWallets`. Signing takes bytes plus the connected wallet and returns signed bytes; it does not send the transaction.

Buy routes USDC → token; sell routes token → USDC. The USDC mint and Solscan cluster follow `NEXT_PUBLIC_SOLANA_CLUSTER`. Decimal conversions use strings and BigInt, not floating-point multiplication. Numeric USD display values are computed separately from formatted receive labels.

## Execution states

```mermaid
flowchart TD
  Idle[idle] --> Quote[Debounced public quote]
  Quote --> Review[Review server quote]
  Quote -- 503 trading_disabled --> Disabled[Demo only · submission disabled; Confirm disabled]
  Quote -- 422 swap_rejected --> Rejected[Show trading-limits message]
  Review --> Auth{Signed in?}
  Auth -- no --> Login[Prompt sign-in]
  Login --> Review
  Auth -- yes --> Creating[creating]
  Creating -- 503 trading_disabled --> Disabled
  Creating -- 422 swap_rejected --> Failed[failed]
  Creating -- 422 sponsor_rejected --> Failed
  Creating -- 409 no linked wallet --> Failed
  Creating --> Expiry{Expired before signing?}
  Expiry -- yes --> Recreate[Re-create once; fresh requestId]
  Recreate -- still expired --> Expired[expired]
  Recreate -- fresh --> Signing[signing]
  Expiry -- no --> Signing
  Signing -- cancelled / error --> Failed
  Signing -- expired during signing --> Expired
  Signing --> Submitting[submitting]
  Submitting -- error / failed --> Failed
  Submitting -- confirmed --> Confirmed[confirmed; Solscan toast]
  Submitting -- submitted --> Confirming[confirming]
  Confirming -- submitted; below poll limit --> Confirming
  Confirming -- confirmed --> Confirmed
  Confirming -- failed / request error --> Failed
  Confirming -- expired --> Expired
  Confirming -- poll limit --> Pending[idle; still pending, check explorer]
```

Every execution creates a new request and obtains a new signature; signed transactions are not reused. An expired transaction is never submitted. Polling is bounded to 40 GET requests (60 seconds of interval waits, plus request latency). A pending message is not a failure or a confirmation: check the linked transaction before retrying.

## Errors and demo gating

| API status / code | User message / behavior |
| ----------------- | ----------------------- |
| `503 trading_disabled` on quote or create | **Demo only · submission disabled**; Confirm disabled; no signing. |
| `422 swap_rejected` | Swap rejected: token, slippage or price impact exceeds trading limits. |
| `422 sponsor_rejected` | Sponsorship rejected. Please try again later. |
| `409` (no linked wallet) | No linked wallet. Create or link your embedded Solana wallet first. |
| Other API errors | Server error message, falling back to “Request failed”. |
| Failed transaction | Returned transaction error, falling back to “Swap failed”. |
| Expired transaction | Quote expired. Review a fresh quote and try again. |

`DEMO_MODE` labels fixture market data only; it does not gate submission. The API determines whether trading is disabled. Receive, minimum receive, price impact, slippage and platform fee use the server quote when available. Client estimates appear only while the quote loads. Network fees are labelled **Sponsored**. A signed-out Confirm prompts sign-in; without a Privy app ID, sign-in is unavailable.

## Screens

| Server quote in ticket | Review server quote |
| ---------------------- | ------------------- |
| ![Ticket with mock server quote](images/swap-ticket.png) | ![Buy review with mock server quote](images/swap-review.png) |

| Trading disabled: ticket | Trading disabled: review |
| ------------------------ | ------------------------ |
| ![503 trading disabled on ticket](images/swap-disabled-ticket.png) | ![503 trading disabled in review; Confirm disabled](images/swap-disabled-review.png) |

| Rejected quote | Sell review |
| -------------- | ----------- |
| ![422 swap rejected message](images/swap-rejected.png) | ![Sell review with numeric USD value](images/swap-sell-review.png) |

These screenshots use a throwaway local HTTP mock API and the real frontend with `NEXT_PUBLIC_API_URL=http://localhost:4100`, signed out and without a Privy app ID. “Server quote” here means a response from that mock, not a live Jupiter quote. The mock supplies market endpoints plus the agreed swap contract and switches quote responses between success, `503 trading_disabled` and `422 swap_rejected`. No auth context was stubbed. Wallet signing, authenticated submission, confirmation toast and real on-chain execution were not exercised by these screenshots; orchestration is covered by Vitest tests.

## Configuration and checks

Use `NEXT_PUBLIC_API_URL` for the Agele API and configure Privy and Solana as described in [Sign-in, embedded wallet and deposit](auth-wallet.md). The swap paths in `lib/api/schema.d.ts` are hand-added against the agreed backend contract; regenerate after the backend merge.

```bash
bun run check
bun run build
```
