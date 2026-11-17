# Sign-in, embedded wallet and deposit

Users sign in with Google (or email) through [Privy](https://docs.privy.io). Privy creates a non-custodial embedded Solana wallet on first login, and the user funds it with USDC. The frontend never handles private keys: key export and signing happen inside Privy's iframe.

## Architecture

```mermaid
flowchart LR
  subgraph Browser["agele-web (browser)"]
    AP["AuthProvider<br/>components/auth/auth-provider.tsx"]
    AC["AuthContext<br/>useAuth()"]
    API["lib/api/client.ts<br/>openapi-fetch + Bearer middleware"]
    AM["AccountMenu<br/>components/wallet/account-menu.tsx"]
    DD["DepositDialog<br/>components/wallet/deposit-dialog.tsx"]
    BAL["useUsdcBalance<br/>hooks/use-usdc-balance.ts"]
  end
  Privy[("Privy<br/>auth + embedded wallets")]
  Agele[("Agele API<br/>GET /v1/me")]
  RPC[("Solana RPC<br/>NEXT_PUBLIC_SOLANA_RPC_URL")]

  AP <--> Privy
  AP --> AC
  AP -- setAccessTokenGetter --> API
  API -- "Authorization: Bearer" --> Agele
  AC --> AM
  AC --> DD
  DD --> BAL
  AM --> BAL
  BAL -- getTokenAccountsByOwner --> RPC
```

Without `NEXT_PUBLIC_PRIVY_APP_ID`, `AuthProvider` provides `demoAuth`: sign-in and Deposit are disabled and the app stays labelled as demo.

## Sign-in and wallet creation

```mermaid
sequenceDiagram
  actor U as User
  participant W as agele-web
  participant P as Privy
  participant A as Agele API

  U->>W: Sign in
  W->>P: login() (Google / email)
  P-->>W: authenticated, access token
  P->>P: create embedded Solana wallet<br/>(createOnLogin: users-without-wallets)
  W->>A: GET /v1/me (Bearer token)
  A-->>W: Me { walletAddress: null, wallets: [] }
  P-->>W: user.linkedAccounts gains Solana wallet
  W->>W: address changed → invalidate ["me"]
  W->>A: GET /v1/me
  A->>P: sync wallets (walletAddress was null)
  A-->>W: Me { walletAddress, wallets[isPrimary] }
```

- `primarySolanaWallet` prefers the Privy embedded wallet (`walletClientType: "privy"`) over external wallets.
- `/v1/me` errors: `401 unauthorized` stays an auth error. `503 auth_not_configured` (API without Privy keys) resolves to `null`, which the UI treats as demo mode.
- If a user has no wallet (for example, creation failed), the account menu offers **Create Solana wallet**.

## Deposit

```mermaid
flowchart TD
  Open["Deposit (portfolio or account menu)"] --> Auth{Signed in?}
  Auth -- no --> SignIn["Prompt to sign in"]
  Auth -- yes --> Wallet{Wallet?}
  Wallet -- no --> Create["Create Solana wallet"]
  Wallet -- yes --> Show["Show address, copy, explorer link,<br/>USDC mint warning"]
  Show --> Poll["Poll USDC balance every 10s"]
  Poll -- balance increased --> Toast["Toast: Deposit received"]
  Show --> Fund["Buy with card or exchange<br/>(Privy useAddFunds, USDC on Solana)"]
```

The USDC mint follows `NEXT_PUBLIC_SOLANA_CLUSTER` (`lib/solana/cluster.ts`): `EPjF…Dt1v` on mainnet-beta, `4zMM…ncDU` on devnet.

## Screens

| Demo build (no Privy app id) | Signed in: account menu |
| --- | --- |
| ![Portfolio in demo mode](images/portfolio-demo.png) | ![Account menu](images/account-menu.png) |

| Signed in: portfolio | Deposit dialog |
| --- | --- |
| ![Portfolio signed in](images/portfolio-signed-in.png) | ![Deposit dialog](images/deposit-dialog.png) |

The screenshots of signed-in screens use a stubbed auth context. The balance shows "Unavailable" because the public mainnet RPC rejects browser token-account queries. Set `NEXT_PUBLIC_SOLANA_RPC_URL` to a domain-restricted provider key (for example, Helius).

## Configuration

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Enables sign-in. Empty means demo mode. |
| `NEXT_PUBLIC_PRIVY_CLIENT_ID` | Optional Privy app client id, per environment. |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `mainnet-beta` (default) or `devnet`. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Browser-safe RPC for balances and Privy signing. |

In the Privy dashboard, enable Google and email login and Solana embedded wallets, and add the app's domains to allowed origins.
