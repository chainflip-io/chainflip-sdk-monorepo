# Chainflip Lending SDK

TypeScript SDK for the Chainflip lending protocol. Wraps the lending RPC methods and extrinsics available on the Chainflip state chain.

## Install

```bash
npm install @chainflip/lending-sdk
```

## Usage

```ts
import { LendingClient } from "@chainflip/lending-sdk";

// Read-only queries (no ApiPromise needed)
const client = new LendingClient();
const pools = await client.getLendingPools();
const config = await client.getLendingConfig();

// With ApiPromise for submitting transactions
import { ApiPromise, WsProvider } from "@polkadot/api";
const api = await ApiPromise.create({ provider: new WsProvider("wss://mainnet-rpc.chainflip.io") });
const client = new LendingClient(undefined, api);

const tx = client.borrow({
  loan_asset: "Usdc",
  loan_amount: "0x1000",
  collateral: { Eth: "0x2000" },
});
await tx.signAndSend(account);
```

## Flow Sequence Diagrams

All flows operate through the account's **free balance** on the state chain. Collateral is debited from free balance; borrowed funds are credited to free balance.

### Borrow

Open a new loan. Collateral is taken from free balance, borrowed funds are credited to free balance.

```mermaid
sequenceDiagram
    participant User
    participant FreeBalance
    participant LoanAccount
    participant LendingPool

    User->>LoanAccount: requestLoan(collateral, loan_asset, loan_amount)
    FreeBalance-->>LoanAccount: debit collateral
    LendingPool-->>FreeBalance: credit borrowed funds
```

### Repay & Close

Fully repay a loan and reclaim all collateral.

```mermaid
sequenceDiagram
    participant User
    participant FreeBalance
    participant LoanAccount
    participant LendingPool

    User->>LoanAccount: makeRepayment(Full)
    FreeBalance-->>LendingPool: debit repayment amount
    User->>LoanAccount: removeCollateral(collateral)
    LoanAccount-->>FreeBalance: credit collateral
```

### Supply Multiple (Lender)

Lender deposits into one or more lending pools.

```mermaid
sequenceDiagram
    participant Lender
    participant FreeBalance
    participant LendingPool

    loop for each asset
        Lender->>LendingPool: addLenderFunds(asset, amount)
        FreeBalance-->>LendingPool: debit amount
    end
```

### Withdraw Supply (Lender)

Lender removes funds from lending pools back to free balance.

```mermaid
sequenceDiagram
    participant Lender
    participant FreeBalance
    participant LendingPool

    loop for each asset
        Lender->>LendingPool: removeLenderFunds(asset, amount?)
        LendingPool-->>FreeBalance: credit amount
    end
```

### Top Up Collateral

Add more collateral from free balance to avoid liquidation.

```mermaid
sequenceDiagram
    participant User
    participant FreeBalance
    participant LoanAccount

    User->>LoanAccount: addCollateral(collateral)
    FreeBalance-->>LoanAccount: debit collateral
```

### Expand Loan

Borrow more against existing or additional collateral.

```mermaid
sequenceDiagram
    participant User
    participant FreeBalance
    participant LoanAccount
    participant LendingPool

    User->>LoanAccount: expandLoan(loan_id, extra_amount, extra_collateral)
    FreeBalance-->>LoanAccount: debit extra collateral
    LendingPool-->>FreeBalance: credit extra borrowed funds
```

### Deleverage

Partial repayment and free up excess collateral.

```mermaid
sequenceDiagram
    participant User
    participant FreeBalance
    participant LoanAccount
    participant LendingPool

    User->>LoanAccount: makeRepayment(partial)
    FreeBalance-->>LendingPool: debit repayment
    User->>LoanAccount: removeCollateral(collateral)
    LoanAccount-->>FreeBalance: credit collateral
```

### Swap Collateral

Replace one collateral type with another.

```mermaid
sequenceDiagram
    participant User
    participant FreeBalance
    participant LoanAccount

    User->>LoanAccount: addCollateral(new asset)
    FreeBalance-->>LoanAccount: debit new collateral
    User->>LoanAccount: removeCollateral(old asset)
    LoanAccount-->>FreeBalance: credit old collateral
```

### Refinance

Close an existing loan and immediately open a new one with different terms.

```mermaid
sequenceDiagram
    participant User
    participant FreeBalance
    participant LoanAccount
    participant LendingPool

    User->>LoanAccount: makeRepayment(Full) [old loan]
    FreeBalance-->>LendingPool: debit repayment
    User->>LoanAccount: requestLoan(new terms)
    FreeBalance-->>LoanAccount: debit collateral
    LendingPool-->>FreeBalance: credit new borrowed funds
```