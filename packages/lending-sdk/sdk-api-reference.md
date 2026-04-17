# Chainflip Lending SDK 

**Complete method documentation with data flow, validation, and database integration**

**SDK development is in progress. Please note that the final version will include certain simplifications compared to the scope presented here, for example batching several extrinsics into an atomic flow (such as opening a deposit account, funding it, and transferring collateral).**

---

## Table of Contents

1. [Method Overview](#method-overview)
2. [Read Methods](#read-methods)
3. [Deposit Channel Methods](#deposit-channel-methods)
4. [Borrow Flows](#borrow-flows)
5. [Repayment Flows](#repayment-flows)
6. [Collateral Management Flows](#collateral-management-flows)
7. [Supply Flows](#supply-flows)
8. [Advanced Flows](#advanced-flows)
9. [Database Design Principles](#database-design-principles)
10. [Event Processing](#event-processing)
11. [Entity Relationships](#entity-relationships)

---

## Method Overview

```
┌──────────────────────────────────────────────────────────┐
│              CHAINFLIP LENDING SDK                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  READ METHODS                                            │
│  ├─ getLoanQuote()           → Calculate loan terms      │
│  ├─ getSupportedAssets()     → List available assets     │
│  ├─ getAssetPoolInfo()       → Pool metrics              │
│  ├─ getProjectedDepositInfo()→ Simulate supply           │
│  ├─ getSuppliedPositionInfo()→ User supply position      │
│  ├─ getBalances()            → Account balances          │
│  ├─ getLoanStatus()          → Loan information          │
│  └─ getDepositChannelStatus()→ Check deposit status      │
│                                                          │
│  WRITE METHODS                                           │
│                                                          │
│  DEPOSIT CHANNEL                                         │
│  └─ openDepositChannel()     → Create channel            │
│                                                          │
│  BORROW FLOWS                                            │
│  ├─ requestLoan()            → Create new loan           │
│  ├─ expandLoan()             → Increase loan amount      │
│  └─ topUpCollateral()        → Add collateral            │
│                                                          │
│  REPAYMENT FLOWS                                         │
│  ├─ repayLoan()              → Partial/full repayment    │
│  ├─ repayAndClose()          → Repay + close position    │
│  ├─ initiateVoluntaryLiquidation() → Opt into liquidation│
│  └─ stopVoluntaryLiquidation() → Cancel liquidation      │
│                                                          │
│  COLLATERAL MANAGEMENT FLOWS                             │
│  ├─ swapCollateral()         → Replace collateral        │
│  └─ deleverage()             → Repay + remove collateral │
│                                                          │
│  SUPPLY FLOWS                                            │
│  ├─ supplyMultiple()         → Deposit to pools          │
│  └─ withdrawSupply()         → Withdraw from pools       │
│                                                          │
│  ADVANCED FLOWS                                          │
│  └─refinance()              → Close old + open new       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Read Methods

### 📊 `getLoanQuote()` - Borrow Amount → Required Collateral

**Purpose:** Calculate collateral required for a given borrow amount

```typescript
getLoanQuote(
  loans: { borrowAmount: string, borrowAsset: ChainflipAsset }[]
  brokerInterestRate?: string, // can be set globally or on individual loan, can be 0
  brokerOriginationRate?: string 
)
```

**Flow:**

```
┌─────────────────┐
│ User Input      │
│ - borrowAmount  │
│ - borrowAsset   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 1. Validate Parameters          │
│    ✓ Supported assets           │
│    ✓ borrowAmount > 0           │
│    ✓ Min borrow value ≥ $100    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 2. Check Pool Liquidity (RPC)   │
│    ⚠️ Insufficient  → Error      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 3. Fetch Fees & Rates (RPC)     │
│    - Origination fee            │
│    - Interest rate              │
│    - Liquidation penalty        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 4. Calculate LTV Tiers          │
│    - Conservative               │
│    - Optimal                    │
│    - Risky                      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Return Quote    │
└─────────────────┘
```

**Data Sources:**
- **RPC:** `cf_lending_pools`, `cf_lending_config`
- **DB:** `Oracle price`,  `AssetConfig`

**Response:**

```typescript
{
  collateralTiers: {
    conservative: {
      usdValue: "5000",
      Btc: "1",
      Usdc: "5000",
      Sol: "200"
      ltv: "0" // min threshold
    },
    optimal: {
      usdValue: "4000",
      Btc: "0.8",
      Usdc: "4000",
      Sol: "150",
      ltv: "0.5"
    },
    risky: {
      usdValue: "3000",
      Btc: "0.7",
      Usdc: "3000",
      Sol: "100", 
      ltv: "0.75" // based on current targetLtvThreshold 
    }
  },
  lendingPools: {
    Usdc: {
      originationFee: "123",
      originationFeeUsd: "123",
      brokerOriginationFee: "123", 
      brokerOriginationFeeUsd: "123", 
      networkFee: "456",
      networkFeeUsd: "456",
      brokerInterestFee: "789",
      brokerInterestFeeUsd: "789",
      totalFee: "10000",
      totalFeeUsd: "10000"
    },
    // ... other assets
  }
}
```

---

### 📊 `getLoanQuote()` - Collateral Amount → Borrow Options

**Purpose:** Calculate borrowable amounts for a given collateral

```typescript
getLoanQuote(
  collateralAmount: string,
  collateralAsset: ChainflipAsset,
  borrowAsset?: ChainflipAsset | ChainflipAsset[],
  brokerInterestRate?: string, 
  brokerOriginationRate?: string 
)
```

**Flow:**

```
┌─────────────────┐
│ User Input      │
│ - collateral    │
│ - borrowAsset?  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 1. Validate & Convert to USD    │
│    Use OraclePrices (DB)        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 2. Calculate Max Borrow         │
│    Per LTV tier × Pool liquidity│
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 3. Return Borrowable Amounts    │
│    For each tier + each asset   │
└─────────────────────────────────┘
```

**Response:**

```typescript
{
  loanAssetTiers: {
    conservative: {
      Btc: "1",
      Usdc: "5000",
      Sol: "200",
      ltv: "0"
    },
    optimal: {
      Btc: "5",
      Usdc: "10000",
      Sol: "2000",
      ltv: "0.5"
    },
    risky: {
      Btc: "10",
      Usdc: "50000",
      Sol: "10000",
      ltv: "0.75"
    }
  },
  lendingPools: { /* fee breakdown per asset */ }
}
```

---

### 🏷️ `getSupportedAssets()`

**Purpose:** List supported assets by operation type

```typescript
getSupportedAssets(type: 'all' | 'supply' | 'borrow')
```

**Data Sources:**
- **DB:** `AssetConfig` (stored in DB)
- **RPC:** `cf_lending_config`

**Response:**

```typescript
["Usdc", "Usdt", "Eth", "Btc", "Sol"]
```

---

### 📊 `getAssetPoolInfo()`

**Purpose:** Get lending pool metrics for an asset

```typescript
getAssetPoolInfo(asset?: ChainflipAsset)
```

**Data Sources:**
- **DB:** `LendingPool` (liquidity, rates) (or RPC `cf_lending_pool`)
- **RPC:** `cf_lending_config`

**Response:**

```typescript
[{
  asset: "Usdc",
  totalSuppliedAmount: "5000000",
  totalSuppliedAmountUsd: "5000000",
  totalBorrowedAmount: "3000000",
  totalBorrowedAmountUsd: "3000000",
  totalAvailableAmount: "2000000",
  totalAvailableAmountUsd: "2000000",
  utilisation: "0.60",
  supplyApy: "4.25",
  borrowApy: "7.80",
  maxLtv: "0.75",
  liquidationThreshold: "0.80",
  liquidationFeeBps: "500",
  originationFeeBps: "100"
}, ...]
```

---

### 📈 `getProjectedDepositInfo()`

**Purpose:** Simulate post-supply metrics

```typescript
getProjectedDepositInfo(
  asset: ChainflipAsset,
  depositAmount: string
)
```

**Calculation:**

```typescript
newTotalSupply = currentTotalSupply + depositAmount
newUtilization = totalBorrowed / newTotalSupply
projectedSupplyApy = borrowRate(newUtilization) × newUtilization × (1 - reserveFactor)
projectedPositionSize = existingUserPosition + depositAmount
projectedPoolShare = projectedPositionSize / newTotalSupply
```

**Response:**

```typescript
{
  asset: "Usdc",
  projectedSupplyApy: "4.12",
  projectedAmount: "15000",
  projectedAmountUsd: "15000",
  projectedPoolShare: "0.003",
  totalSuppliedAmount: "50015000",
  totalSuppliedAmountUsd: "50015000",
  totalBorrowedAmount: "30000000",
  totalBorrowedAmountUsd: "30000000",
  totalAvailableAmount: "2000000",
  totalAvailableAmountUsd: "2000000"
  utilizationRate: "0.599"
}
```

**Data Sources:**
- **RPC:** `cf_lending_pool`, `cf_lending_config`
---

### 💼 `getSuppliedPositionInfo()`

**Purpose:** Get user's supply position

```typescript
getSuppliedPositionInfo(
  cfAddress?: string, 
  asset?: ChainflipAsset
)
```
If we don't pass cfAddress, can get all supplied positions per pool 
If we don't pass asset, can get all supplied positions per cfAddress

**Data Sources:**
- **DB:** `SupplyEvents` (to calculate interestEarned, poolShare)
- **RPC:** `cf_lending_pools`

**Response:**

```typescript
{
  totalSupplied: "123",
  totalSuppliedUsd: "123",
  totalInterest: "123", // totalEarned
  totalInterestUsd: "123",
  poolShareBps: "1000",
  weightedAvgApy: "4.25",
  positions: [
    {
      asset: "Usdc",
      suppliedAmount: "1000",
      amountUsd: "1000", 
      interest
    }
  ]
}
```

---

### 💰 `getBalances()`

**Purpose:** Get account balances

```typescript
getBalances(address: string)
```

**Data Sources:**
- **RPC:** Account free balances `cf_account_info`

**Response:**

```typescript
{
  freeBalances: {
    Btc: { value: "123", valueUsd: "123" },
    Usdc: { value: "456", valueUsd: "456" }
  },
  collateralBalances: {
    Btc: { value: "789", valueUsd: "789" }
  }
}
```

---

### 📋 `getLoanStatus()`

**Purpose:** Get recent loan status and details

```typescript
getLoanStatus(
  params: { loanId: string } | { address: string } | { txId: string }
)
```

**Loan Statuses:**

```
Level 1: Initial Request
             ┌──────────────────┐
             │  LOAN_REQUESTED  │
             └────────┬─────────┘
                      │
      ┌───────────────┼───────────────┬──────────────┬──────────────┐
      │               │               │              │              │              
      ▼               ▼               ▼              ▼              ▼              
Level 2: Deposit Channel Stage
┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐
│   PENDING   │ │  CREDITED   │ │   EXPIRED    │ │DEPOSIT_FAILED│ │  REFUNDED   │
└────── ──────┘ └─────┬───────┘ └──────────────┘ └──────────────┘ └─────────────┘
                      │
                      │
        ──────────────┬──────────────┬─────────────────────┬────────────────────────────────┐
       │              │              │                     │                                │                           
       ▼              ▼              ▼                     ▼                                ▼                           
Level 3: Loan Lifecycle States
┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ ┌──────────────────┐ ┌───────────────────────────┐
│   ACTIVE    │ │   REPAID    │ │ SOFT_LIQUIDATED │ │ HARD_LIQUIDATED  │ │SOFT_VOLUNTARY_LIQUIDATED  │
└─────────────┘ └─────────────┘ └─────────────────┘ └──────────────────┘ └───────────────────────────┘
```


**Data Sources:**
- **DB:** `DepositChannel`, `Deposit`, `Loan`, `LoanEvent` (limited statuses from rpc)

**Response (by loanId):**

```typescript
{
  loanId: "abc123",
  borrowedAmount: "5000",
  borrowedAmountUsd: "5000",
  asset: "Usdc",
  status: "Active",
  createdAt: "12-02-2026",
  updatedAt: "12-02-2026"
}
```

**Response (by address):**

```typescript
{
  loans: [
    {
      loanId: "abc123",
      borrowedAmount: "5000",
      borrowedAmountUsd: "5000",
      asset: "Usdc",
      status: "Repaid",
      createdAt: "12-02-2026",
      updatedAt: "12-02-2026"
    },
    // ... more loans
  ]
}
```
### 🔍 `getDepositChannelStatus()`

**Purpose:** Check deposit channel status (might be deprecated with protocol upgrade)

```typescript
getDepositChannelStatus(
  chain: ChainflipChain,
  channelId: string,
  issuedBlockId: string
)
```

**Data Sources:**
- **DB:** `DepositChannels`, `Deposit`
---

## Deposit Channel Methods

### 🚪 `openDepositChannel()` (might be deprecated with protocol upgrade)

**Purpose:** Create deposit channel for collateral

```typescript
openDepositChannel(
  asset: ChainflipAsset,
  refundAddress: string
)
```

**Flow:**

```
┌─────────────────────┐
│ Check LP Account    │
│ Registration        │
└──────┬──────────────┘
       │
       ├─────────────────┬──────────────────┐
       │                 │                  │
   Not Registered   Registered
       │                 │
       ▼                 ▼
┌──────────────┐   ┌──────────────────┐
│ Create       │   │ Open Channel     │
│ Account +    │   │ via openChannel()│
│ Channel      │   └─────────┬────────┘
└──────┬───────┘             │
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Return Status  │
         │ + Deposit Addr │
         └────────────────┘
```

**Database Impact:**
- **Writes to DB:**  `LiquidityDepositChannel` table (on DepositChannelOpened event)
`LiquidityDeposit` record for every deposit received 

---


## Borrow Flows

### 🏦 `requestLoan()` 

**Purpose:** Execute loan request

```typescript
requestLoan(
  loans: { borrowAmount: string; borrowAsset: ChainflipAsset; collateralAsset: ChainflipAsset; collateralAmount: string; receivingAddress: string }[]
  brokerInterestRate?: string, 
  brokerOriginationRate?: string 
)
```
Removed refundAddress because it can be default or configured at openDepositChanel() level

**Flow:**

```
┌──────────────────────┐
│ Validate Parameters  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Batch Extrinsics:                │
│ 1. addCollateral()               │
│ 2. requestLoan()                 │
│ 3. withdrawLiquidity()           │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────┐
│ Sign & Submit        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Return Status        │
└──────────────────────┘
```

**Database Impact:**
```
Events Written:
├─ CollateralEvent (type: 'ADDED')
├─ Loan (status: 'Pending') -> Loan (status: 'Active'), principal, interest... 
├─ LoanEvent (type: 'CREATED')
└─ FeeEvent (type: 'ORIGINATION'), (type: 'INTEREST'), (type: 'NETWORK') 

```

---

### 📈 `expandLoan()` 

**Purpose:** Increase existing loan amount

```typescript
expandLoan(
  cfAccount: string,
  loans: { loanId: string; additionalAmount: string; receivingAddress: string }[]
  brokerInterestRate?: string, 
  brokerOriginationRate?: string 
)
```

**Validation:**
- Re-check health factor before expansion
- Cannot exceed max risky ltv
- Each expansion recalculates risk metrics

**Batch Operations:**
```typescript
for each loan:
  expandLoan(loanId, additionalAmount)
  withdrawLiquidity(asset, additionalAmount, receivingAddress)
```

**Database Impact:**
```
Events Written:
├─ Loan (updated principal)
└─ LoanEvent (type: 'INCREASED')
```

---

### 🔒 `topUpCollateral()` 

**Purpose:** Add collateral to position

```typescript
topUpCollateral(
  cfAccount: string,
  collateral: { collateralAsset: ChainflipAsset; collateralAmount: string }[]
)
```

**Flow:**
```
Batch: addCollateral(asset, amount) for each asset
→ Return updated collateral balances and health factor
```

**Database Impact:**
```
Events Written:
└─ CollateralEvent (type: 'ADDED') for each asset
```

---

## Repayment Flows

### 💸 `repayLoan()` 

**Purpose:** Repay loans (partial or full)

```typescript
repayLoan(
  cfAddress: string,
  repayments: { loanId: string; amount: 'Full' | string }[]
)
```

**Flow:**

```
┌─────────────────────────┐
│ Validate Parameters     │
│ - Account exists        │
│ - Loan belongs to user  │
│ - Sufficient balance    │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ For each repayment:     │
│ makeRepayment(loanId,   │
│   amount)               │
└──────────┬──────────────┘
           │
           ▼
     ┌─────┴──────┐
     │            │
  'Full'      Partial
     │            │
     ▼            ▼
┌─────────┐  ┌─────────┐
│ Loan    │  │ Loan    │
│ Status  │  │ Status  │
│ REPAID  │  │ ACTIVE  │
└─────────┘  └─────────┘
```

**Database Impact:**
```
Events Written:
├─ FeeEvent (type: 'INTEREST') (might be added on every X block instead of repayment)
├─ Loan (updated principal or status='REPAID')
├─ LoanEvent (type: 'REPAID_PARTIAL' or 'REPAID_FULL')
└─ SupplyPosition (interest distributed) (also might be every X block)
```

---

### 🏁 `repayAndClose()`

**Purpose:** Fully repay and close position

```typescript
repayAndClose(
  cfAccount: string,
  loanId: string[],
  receivingAddresses: { asset: ChainflipAsset; address: string }[]
)
```

**Flow:**

```
┌─────────────────────────────┐
│ Fetch All Positions         │
│ - All loanIds               │
│ - All collateral balances   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Batch Operations:           │
│ 1. makeRepayment('Full')    │
│    for each loan            │
│ 2. removeCollateral()       │
│    for each asset           │
│ 3. withdrawLiquidity()      │
│    to receiving addresses   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Return:                     │
│ - All loans → REPAID        │
│ - All collateral withdrawn  │
│ - Final balances            │
└─────────────────────────────┘
```

**Database Impact:**
```
Events Written:
├─ LoanEvent (type: 'REPAID_FULL') for each loan
├─ CollateralEvent (type: 'REMOVED') for each asset
└─ Loan (status: 'REPAID')
```


### 🔄 `initiateVoluntaryLiquidation()`

**Purpose:** Opt into voluntary liquidation by setting a flag that triggers the liquidation process. This allows a borrower to voluntarily liquidate their position.

```typescript
initiateVoluntaryLiquidation({ loanId: string })
```

**Requirements:**
- Borrower must have active loans with collateral

**Flow:**

```
┌─────────────────────────────┐
│ Borrower initiates          │
│ voluntary liquidation       │
└──────────┬──────────────────┘
           │
           ▼
    ┌──────────────┐
    │ Set voluntary│
    │ liquidation  │
    │ flag = true  │
    └──────┬───────┘
           │
           ▼
┌──────────────────────────────┐
│ Liquidation process triggers │                       
└──────────────────────────────┘
```

**Database Impact:**
```
Events Written:
├─ LiquidationEvent (type: 'SOFT_VOLUNTARY_LIQUIDATED')
└─ LoanEvent (status updates)
```

---

### 🛑 `stopVoluntaryLiquidation()`

**Purpose:** Cancel a previously initiated voluntary liquidation by unsetting the liquidation flag.

```typescript
stopVoluntaryLiquidation({ loanId: string }): 
```

**Requirements:**
- Voluntary liquidation must have been previously initiated
- Liquidation process must not have already completed

**Flow:**

```
┌─────────────────────────────┐
│ Borrower stops              │
│ voluntary liquidation       │
└──────────┬──────────────────┘
           │
           ▼
    ┌──────────────┐
    │ Set voluntary│
    │ liquidation  │
    │ flag = false │
    └──────┬───────┘
           │
           ▼
┌──────────────────────────────┐
│ Liquidation process cancelled│
│ Loans remain active          │
└──────────────────────────────┘
```

**Database Impact:**
```
Events Written:
└─ LoanEvent (status updates)
```
---

## Collateral Management Flows

### 🔄 `swapCollateral()`

**Purpose:** Replace one collateral with another

```typescript
swapCollateral(
  cfAccount: string,
  collateralToRemove: { asset: ChainflipAsset; amount: string },
  collateralToAdd: { asset: ChainflipAsset; amount: string }
)
```

**Critical Order:**
```
1. Add new collateral FIRST
   ↓
2. Then remove old collateral
   ↓
3. Ensure resulting mix remains healthy
```

**Batch:**
```typescript
addCollateral(collateralToAdd)
removeCollateral(collateralToRemove)
```

**Database Impact:**
```
Events Written:
├─ CollateralEvent (type: 'ADDED')
└─ CollateralEvent (type: 'REMOVED')
```

---

### ⚖️ `deleverage()`

**Purpose:** Repay loans and free excess collateral

```typescript
deleverage(
  cfAccount: string,
  repayments: { loanId: string; amount: 'Full' | string }[],
  collateralRemovals: { asset: ChainflipAsset; amount: string | 'Full' }[]
)
```

**Validation:**
- Must simulate post-state before execution
- Cannot remove collateral if resulting LTV becomes unhealthy

**Batch:**
```typescript
for each repayment:
  makeRepayment(loanId, repayAmount)

for each removal:
  removeCollateral(asset, amount)
```

**Database Impact:**
```
Events Written:
├─ LoanEvent (REPAID_PARTIAL/FULL)
└─ CollateralEvent (REMOVED)
```

---

## Supply Flows 

### 🏦 `supplyMultiple()`

**Purpose:** Supply assets to lending pools

```typescript
supplyMultiple(
  assets: { asset: ChainflipAsset; amount: string }[]
)
```

**Flow:**

```
┌─────────────────────────┐
│ Validate Each Asset:    │
│ - Asset supported       │
│ - Amount > 0            │
│ - Pool open             │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Batch:                  │
│ addLenderFunds(asset,   │
│   amount)               │
│ for each asset          │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Return:                 │
│ - Supplied amounts      │
│ - Current APR           │
│ - Pool shares           │
│ - Timestamp             │
└─────────────────────────┘
```

**Database Impact:**
```
Events Written:
├─ SupplyEvent (type: 'SUPPLIED') for each asset
└─ SupplyPosition (updated)
```

---

### 💵 `withdrawSupply()` 

**Purpose:** Withdraw supply and earnings

```typescript
withdrawSupply(
  cfAccount: string,
  receivingAddresses?: { asset: ChainflipAsset; address: string }[]
)
```

**Flow:**

```
┌─────────────────────────┐
│ Fetch Supply Positions  │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Batch:                  │
│ 1. removeLenderFunds()  │
│ 2. withdrawLiquidity()  │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Return Final Amounts    │
└─────────────────────────┘
```

**Database Impact:**
```
Events Written:
├─ SupplyEvent (type: 'WITHDRAWN')
└─ SupplyPosition (updated)
```

---

## Advanced Flows 

### 🔄 `refinance()` 

**Purpose:** Close existing loans and open new ones

```typescript
refinance(
  cfAccount: string,
  newLoans: { asset: ChainflipAsset; amount: string }[],
  brokerInterestRate?: string, 
  brokerOriginationRate?: string 
)
```

**Flow:**

```
┌─────────────────────────────────┐
│ Fetch All Loan IDs by cfAccount │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────┐
│ Batch Operations:       │
│                         │
│ 1. Close Old Loans      │
│    makeRepayment('Full')│
│    for each existing    │
│                         │
│ 2. Open New Loans       │
│    requestLoan()        │
│    for each new loan    │
│                         │
│ 3. Withdraw             │
│    withdrawLiquidity()  │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Return:                 │
│ - Old loans → REPAID    │
│ - New loans → ACTIVE    │
│ - New origination fees  │
└─────────────────────────┘
```

**Database Impact:**
```
Events Written:
├─ LoanEvent (type: 'REPAID_FULL') for old loans
├─ Loan (status: 'REPAID') for old loans
├─ Loan (status: 'ACTIVE') for new loans
├─ LoanEvent (type: 'CREATED') for new loans
└─ FeeEvent (type: 'ORIGINATION') for new loans
```

---


## Database Design Principles

### Overview

The Lending SDK database is designed as a **self-contained, event-driven system** that:

✅ **Maintains real-time current state** (like Cache service)

✅ **Tracks complete historical events** (like Liquidity-Provision service)

✅ **Provides fast queries for SDK methods**

✅ **Processes blockchain events in real-time**

✅ **Supports rich analytics and reporting**

### Architecture

```
┌─────────────────┐                  ┌─────────────────┐
│  State Chain    │                  │   RPC Queries   │
│  Events         │                  │ (cf_lending_*)  │
└────────┬────────┘                  └────────┬────────┘
         │                                    │
         ▼                                    │
┌──────────────────────┐                           │
│ Rpc, Event Processor │                           │
└────────┬─────────────┘                           │
         │                                    │
         ├──────────────┬──────────────┬──────┼──────┐
         │              │              │      │      │
         ▼              ▼              ▼      │      │
┌────────────┐   ┌──────────────┐  ┌────────────┐    │
│Current State│  │Event History │  │ Analytics  │    │
│   (DB)      │  │    (DB)      │  │   (DB)     │    │
│             │  │              │  │            │    │
│• Loan       │  │• LoanEvent   │  │•PoolSnapshot│   │
│• SupplyPos  │  │•CollateralEvt│  │• PoolStat  │    │
│             │  │• SupplyEvent │  │• UserStat  │    │
│             │  │• FeeEvent    │  └────────────┘    │
│             │  │•LiquidatiEvt │                    │
└─────────────┘  └──────────────┘                    │
                                                     │
┌────────────────────────────────────────────────────┘
│
│  ┌────────────────┐
└─►│Infrastructure  │
   │     (DB)       │
   │                │
   │• DepositChan   │
   │• OraclePrice   │
   └────────┬───────┘
            │
            ▼
   ┌─────────────────┐
   │  Lending SDK    │
   │  GraphQL API    │◄─────── Fetches from RPC:
   │                 │         • Account
   └─────────────────┘         • LoanAccount
                               • CollateralBalance
                               • LendingPool
                               • GlobalConfig
                               • SafeMode
```

### Design Principles

**1. Unified service approach**
- The Lending SDK combines functionality from three existing Chainflip services:
  - **Cache service** — Real-time current state (pool metrics, balances, rates)
  - **Liquidity-Provision service** — Historical event tracking and analytics
  - **Explorer service** — Transaction and event history indexing
- This consolidation provides a single, comprehensive interface for all lending operations

**2. Optimized data architecture**
- DB design carefully balances between SDK database storage and RPC queries
- Avoids duplicating work by leveraging existing RPC methods (`cf_lending_pools`, `cf_lending_config`, `cf_account_info`)
- Stores only what RPCs cannot provide: historical events, aggregated metrics, USD conversions, deposit channel lifecycle
- Minimizes database complexity while maximizing query performance

**3. Chain is the source of truth for current state**
- DB only stores what the chain cannot answer: history, aggregated metrics, USD values, off-chain preferences
- Current state (balances, positions, pool liquidity) is always fetched from RPC for accuracy

**4. Events drive writes**
- Every DB mutation is triggered by an on-chain event or scheduled job
- No speculative writes

**5. executed_block_index format**
- `"{blockHeight}-{eventIndexInBlock}"` (e.g., `"1234567-3"`)
- Uniquely identifies event position in state chain
- No need for separate Block/Event tables

---

## Event Processing

### Key Events → Database Models Updated

**Note:** LoanAccount, CollateralBalance, LendingPool are fetched from RPC, not stored in DB.

| Event | DB Models Updated |
|-------|-------------------|
| `LoanCreated` | Loan, LoanEvent (lpAccount, executedBlockIndex) |
| `LoanUpdated` | Loan, LoanEvent (lpAccount, executedBlockIndex) |
| `LoanRepaid` | Loan, LoanEvent, SupplyPosition (lpAccount, executedBlockIndex)? |
| `LoanSettled` | Loan, LoanEvent (lpAccount, executedBlockIndex) |
| `InterestTaken` | FeeEvent, SupplyPosition (lpAccount, executedBlockIndex) |
| `OriginationFeeTaken` | FeeEvent (lpAccount, executedBlockIndex) |
| `LiquidationFeeTaken` | FeeEvent, LiquidationEvent (lpAccount, executedBlockIndex) |
| `CollateralAdded` | CollateralEvent (lpAccount, executedBlockIndex) |
| `CollateralRemoved` | CollateralEvent (lpAccount, executedBlockIndex) |
| `LenderFundsAdded` | SupplyEvent, SupplyPosition (lpAccount, executedBlockIndex) |
| `LenderFundsRemoved` | SupplyEvent, SupplyPosition (lpAccount, executedBlockIndex) |
| `LiquidationInitiated` | LiquidationEvent, Loan (lpAccount, executedBlockIndex) |
| `LiquidationCompleted` | LiquidationEvent, Loan (lpAccount, executedBlockIndex) |


---

## Entity Relationships

```
┌──────────────────────────────────────────────────────────────────────┐
│                      CONFIGURATION LAYER (DB)                         │
└──────────────────────────────────────────────────────────────────────┘

   ┌──────────────┐               ┌─────────────┐
   │ AssetConfig  │               │ OraclePrice │
   │              │               │             │
   │ asset        │               │ baseAsset   │
   │ canBorrow    │               │ quoteAsset  │
   │ canSupply    │               │ price       │
   │canCollateral │               │ priceValid  │
   └──────────────┘               │   FromBlock │
                                  │ priceValid  │
                                  │   ToBlock   │
                                  │ execBlkIndex│
                                  └─────────────┘

Note: GlobalConfig, SafeMode are fetched from RPC


┌──────────────────────────────────────────────────────────────────────┐
│                      CURRENT STATE LAYER (DB)                         │
└──────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  LendingPool     │◄────────┐
    │                  │         │
    │ asset            │         │*
    │ totalSupplied    │    ┌────┴────────┐
    │ totalBorrowed    │    │    Loan     │
    │ totalAvailable   │    │             │
    │ utilisation      │    │ lpAccount   │
    │ supplyApy        │    │ principal   │
    │ borrowApy        │    │ interest    │
    │ maxLtv           │    │ status      │
    │ liquidationFee   │    │ createdAt   │
    │ originationFee   │    │depositChanId│
    └────────┬─────────┘    └─────────────┘
             │
             │*
             │
    ┌────────▼──────────┐
    │ SupplyPosition    │
    │                   │
    │ lpAccount         │
    │ suppliedAmount    │
    │ interestEarned    │
    │ poolShareBps      │
    └───────────────────┘


    ┌─────────────────────────┐
    │LiquidityDepositChannel  │
    │                         │
    │ lpAccount               │
    │ asset                   │
    │ chain                   │
    │ channelId               │
    │ depositAddress          │
    │ totalDeposited          │
    │ timestamp               │
    │ execBlkIndex            │
    └────────┬────────────────┘
             │
             │1
             │
             │*
    ┌────────▼────────────┐
    │ LiquidityDeposit    │
    │                     │
    │ id                  │
    │ depositAmount       │
    │ depositAmountUsd    │
    │ fee                 │
    │ feeUsd              │
    │ timestamp           │
    │ execBlkIndex        │
    └─────────────────────┘

Note: Account, LoanAccount, CollateralBalance are fetched from RPC


┌──────────────────────────────────────────────────────────────────────┐
│                      HISTORICAL EVENTS LAYER (DB)                     │
└──────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐  ┌───────────────┐  ┌────────────┐  ┌───────────┐
    │  LoanEvent   │  │CollateralEvent│  │SupplyEvent │  │  FeeEvent │
    │              │  │               │  │            │  │           │
    │ lpAccount    │  │ lpAccount     │  │ lpAccount  │  │ lpAccount │
    │ loanId       │  │ type          │  │ type       │  │ loanId    │
    │ type         │  │ asset         │  │ amount     │  │ type      │
    │ amount       │  │ amount        │  │execBlkIndex│  │ amount    │
    │ execBlkIndex │  │ execBlkIndex  │  │ timestamp  │  │ feeSplits │
    │ timestamp    │  │ timestamp     │  └────────────┘  │execBlkIndex│
    └──────────────┘  └───────────────┘                  │ timestamp  │
                                                          └───────────┘

    ┌────────────────────┐
    │ LiquidationEvent   │
    │                    │
    │ lpAccount          │
    │ loanId             │
    │ type               │
    │ collateralLiquid   │
    │ debtRepaid         │
    │ excessReturned     │
    │ execBlkIndex       │
    │ timestamp          │
    └────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                         ANALYTICS LAYER (DB)                          │
└──────────────────────────────────────────────────────────────────────┘

         ┌──────────────┐
    ┌───►│PoolSnapshot  │◄───┐
    │    │              │    │
    │1   │ asset        │    │*
    │    │ amountsAtBlk │    │
    │    │ ratesAtBlock │    │
    │    │ execBlkIndex │    │
    │    │ feesEarned   │    │
    │    │ liquidations │    │
    │    │ avgMetrics   │    │
    │    └──────────────┘    │
    │                        │
┌───┴──────────┐      ┌──────┴────┐
│ LendingPool  │      │OraclePrice│
│              │      │           │
└──────────────┘      └───────────┘


    ┌────────────┐
    │  LpStat    │
    │            │
    │ lpAccount  │
    │borrowTotals│
    │supplyTotals│
    │avgHealthFct│
    └────────────┘
```


**End of Document**