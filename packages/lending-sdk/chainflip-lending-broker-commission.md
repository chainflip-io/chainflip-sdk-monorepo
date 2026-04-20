# Chainflip lending - broker commission

There are two types of fees:

- Borrow Interest fees - accrued continuously throughout the lifetime of the loan
- Loan origination fees - to be charged one-time at the point of loan issuance

In both cases, the broker commission is added on top of the corresponding retail borrow fees.

Interest fees accrual period: same frequency as interest network fee (every 10 blocks).

## Test scenarios

### 1. Interest fees

```
pool_borrow_rate: 3.5%
utilization: 65%
chainflip_network_fee: 1%
broker_fee: 0.2%

broker_specific_borrow_rate = pool_borrow_rate + broker_fee
pool_supply_rate = (pool_borrow_rate - chainflip_network_fee) * utilization
```

### 2. Origination fees

```
loan_origination_fee_broker_total = chainflip_origination_fee + broker_origination_fee
```

## Payout process

1. Fees on loans will be denominated in the loan asset
2. Fees are credited immediately on the broker's account
3. Earned fees need to be claimed by brokers

## Broker fee caps

The brokers can set whatever fee they want, however, each fee will have its own individual cap.

Default caps, absolute values:

- `broker_fee_cap` = 1000 bps
- `broker_origination_fee_cap` = 100 bps
