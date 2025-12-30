import * as base58 from '@chainflip/utils/base58';
import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { Server } from 'http';
import prisma from 'packages/swap/src/client.js';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures.js';
import { check, processEvents } from '../../../../event-handlers/__tests__/utils.js';
import { DepositFinalisedArgsMap } from '../../../../event-handlers/ingress-egress/depositFinalised.js';
import { AccountCreationDepositAddressReadyArgs } from '../../../../event-handlers/swapping/accountCreationDepositAddressReady.js';
import { SwapExecutedArgs } from '../../../../event-handlers/swapping/swapExecuted.js';
import { SwapRequestCompletedArgs } from '../../../../event-handlers/swapping/swapRequestCompleted.js';
import { SwapRequestedArgs } from '../../../../event-handlers/swapping/swapRequested.js';
import { SwapScheduledArgs } from '../../../../event-handlers/swapping/swapScheduled.js';
import app from '../../../../server.js';

const brokerId = 'cFK8ZPEpttJD8WJruxofbXy6YxxFVPe6bo1rJqffE46Ej9HFb';
const lpId = 'cFPbJHHG2U2Jn8DUx6kVAH8AEUGHN76Gsq8q39CkUr64hsRH4';

const events = [
  // 0
  {
    id: '0000000086-000632-f8e73',
    blockId: '0000000086-f8e73',
    indexInBlock: 632,
    name: 'Swapping.AccountCreationDepositAddressReady',
    args: check<AccountCreationDepositAddressReadyArgs>({
      boostFee: 0,
      channelId: '85',
      depositAddress: {
        value: bytesToHex(base58.decode('4Az8dFA8ugjcx791yEW4gWKuNoPEw6cPC83Hr64Q5TwH')),
        __kind: 'Sol',
      },
      channelOpeningFee: '0',
      depositChainExpiryBlock: '265',
      requestedBy: ss58.toPublicKey(brokerId),
      requestedFor: ss58.toPublicKey(lpId),
      refundAddress: {
        __kind: 'Sol',
        value: bytesToHex(base58.decode('EsGSx1QKSc2YNjEkg66CZofUUA58BZHgPPPUfhfgo1oy')),
      },
      asset: { __kind: 'Sol' },
    }),
  },
  // 1
  {
    id: '0000000092-000398-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 398,
    name: 'Swapping.SwapRequested',
    args: check<SwapRequestedArgs>({
      origin: {
        __kind: 'DepositChannel',
        channelId: '85',
        depositAddress: {
          value: bytesToHex(base58.decode('4Az8dFA8ugjcx791yEW4gWKuNoPEw6cPC83Hr64Q5TwH')),
          __kind: 'Sol',
        },
        depositBlockHeight: '222',
        brokerId: ss58.toPublicKey(brokerId),
      },
      brokerFees: [],
      inputAsset: { __kind: 'Sol' },
      inputAmount: '17000000',
      outputAsset: { __kind: 'Flip' },
      requestType: {
        __kind: 'Regular',
        outputAction: {
          __kind: 'CreditFlipAndTransferToGateway',
          accountId: ss58.toPublicKey(lpId),
          flipToSubtractFromSwapOutput: (5e18).toString(),
        },
      },
      swapRequestId: '368',
    }),
  },
  // 2
  {
    id: '0000000092-000399-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 399,
    name: 'Swapping.SwapScheduled',
    args: check<SwapScheduledArgs>({
      swapId: '423',
      swapType: { __kind: 'Swap' },
      executeAt: 94,
      inputAmount: '17000000',
      swapRequestId: '368',
    }),
  },
  // 3
  {
    id: '0000000092-000400-77afe',
    blockId: '0000000092-77afe',
    indexInBlock: 400,
    name: 'SolanaIngressEgress.DepositFinalised',
    args: check<DepositFinalisedArgsMap['Solana']>({
      originType: {
        __kind: 'DepositChannel',
      },
      asset: { __kind: 'Sol' },
      action: { __kind: 'Swap', swapRequestId: '368' },
      amount: '10000000000',
      channelId: '85',
      ingressFee: '0',
      blockHeight: '222',
      depositAddress: bytesToHex(base58.decode('4Az8dFA8ugjcx791yEW4gWKuNoPEw6cPC83Hr64Q5TwH')),
      depositDetails: {
        __kind: 'Channel',
        value: bytesToHex(
          base58.decode(
            '2ddCezHSEUQVufyo4Rq7dPkCtpLB1KAhhmNJq5mJyQYQ9Jus7PgtBHdhFjZqpWGkPJGa2tCGnSym2SCNpnY892Y9',
          ),
        ),
      },
      maxBoostFeeBps: 0,
    }),
  },
  // 4
  {
    id: '0000000094-000594-75b12',
    blockId: '0000000094-75b12',
    indexInBlock: 594,
    name: 'Swapping.SwapExecuted',
    args: check<SwapExecutedArgs>({
      swapId: '423',
      brokerFee: '0',
      inputAsset: { __kind: 'Sol' },
      networkFee: '0',
      inputAmount: '17000000',
      outputAsset: { __kind: 'Flip' },
      outputAmount: (5e18).toString(),
      swapRequestId: '368',
      intermediateAmount: '5000000',
    }),
  },
  // 5
  {
    id: '0000000094-000596-75b12',
    blockId: '0000000094-75b12',
    indexInBlock: 596,
    name: 'Swapping.SwapRequestCompleted',
    args: check<SwapRequestCompletedArgs>({
      swapRequestId: '368',
      reason: { __kind: 'Executed' },
    }),
  },
];

describe('account creation swap', () => {
  let server: Server;
  vi.setConfig({ testTimeout: 5000 });

  beforeAll(async () => {
    mockRpcResponse({ data: environment() });
    server = app.listen(0);

    return () => {
      server.close();
    };
  });

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE
      "SwapDepositChannel",
      "Swap",
      "SwapRequest",
      "FailedSwap",
      "Broadcast",
      "Egress",
      private."DepositChannel",
      "AccountCreationDepositChannel",
      "ChainTracking",
      private."SolanaPendingTxRef"
      CASCADE`;
  });

  const channelId = '86-Solana-85';

  it('gets deposit channel info', async () => {
    await processEvents(events.slice(0, 1), [], '200');

    const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

    expect(status).toBe(200);
    expect(body).toMatchInlineSnapshot(`
      {
        "brokers": [
          {
            "account": "cFK8ZPEpttJD8WJruxofbXy6YxxFVPe6bo1rJqffE46Ej9HFb",
            "commissionBps": 0,
          },
        ],
        "depositChannel": {
          "createdAt": 516000,
          "depositAddress": "4Az8dFA8ugjcx791yEW4gWKuNoPEw6cPC83Hr64Q5TwH",
          "id": "86-Solana-85",
          "isExpired": false,
          "liquidityProvider": "cFPbJHHG2U2Jn8DUx6kVAH8AEUGHN76Gsq8q39CkUr64hsRH4",
          "openedThroughBackend": false,
          "srcChainExpiryBlock": "265",
        },
        "destAsset": "FLIP",
        "destChain": "Ethereum",
        "estimatedDurationSeconds": 175.2,
        "estimatedDurationsSeconds": {
          "deposit": 67.2,
          "egress": 96,
          "swap": 12,
        },
        "fees": [],
        "srcAsset": "SOL",
        "srcChain": "Solana",
        "srcChainRequiredBlockConfirmations": 2,
        "state": "WAITING",
      }
    `);
  });

  it('gets in progress swap info', async () => {
    await processEvents(events.slice(0, 2), [], '200');

    const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

    expect(status).toBe(200);
    expect(body).toMatchInlineSnapshot(`
      {
        "brokers": [],
        "deposit": {
          "amount": "17000000",
          "witnessedAt": 552000,
          "witnessedBlockIndex": "92-398",
        },
        "depositChannel": {
          "createdAt": 516000,
          "depositAddress": "4Az8dFA8ugjcx791yEW4gWKuNoPEw6cPC83Hr64Q5TwH",
          "id": "86-Solana-85",
          "isExpired": false,
          "liquidityProvider": "cFPbJHHG2U2Jn8DUx6kVAH8AEUGHN76Gsq8q39CkUr64hsRH4",
          "openedThroughBackend": false,
          "srcChainExpiryBlock": "265",
        },
        "destAsset": "FLIP",
        "destChain": "Ethereum",
        "estimatedDurationSeconds": 175.2,
        "estimatedDurationsSeconds": {
          "deposit": 67.2,
          "egress": 96,
          "swap": 12,
        },
        "fees": [],
        "srcAsset": "SOL",
        "srcChain": "Solana",
        "srcChainRequiredBlockConfirmations": 2,
        "state": "WAITING",
        "swapId": "368",
      }
    `);

    expect(await prisma.solanaPendingTxRef.findFirstOrThrow()).toMatchInlineSnapshot(
      {
        accountCreationDepositChannelId: expect.any(BigInt),
        id: expect.any(Number),
      },
      `
      {
        "accountCreationDepositChannelId": Any<BigInt>,
        "address": null,
        "failedVaultSwapId": null,
        "id": Any<Number>,
        "slot": null,
        "swapDepositChannelId": null,
        "vaultSwapRequestId": null,
      }
    `,
    );
  });

  it('gets completed swap info', async () => {
    await processEvents(events, [], '200');

    const { body, status } = await request(server).get(`/v2/swaps/${channelId}`);

    expect(status).toBe(200);
    expect(body).toMatchInlineSnapshot(`
      {
        "brokers": [],
        "deposit": {
          "amount": "10000000000",
          "witnessedAt": 552000,
          "witnessedBlockIndex": "92-400",
        },
        "depositChannel": {
          "createdAt": 516000,
          "depositAddress": "4Az8dFA8ugjcx791yEW4gWKuNoPEw6cPC83Hr64Q5TwH",
          "id": "86-Solana-85",
          "isExpired": false,
          "liquidityProvider": "cFPbJHHG2U2Jn8DUx6kVAH8AEUGHN76Gsq8q39CkUr64hsRH4",
          "openedThroughBackend": false,
          "srcChainExpiryBlock": "265",
        },
        "destAsset": "FLIP",
        "destChain": "Ethereum",
        "estimatedDurationSeconds": 175.2,
        "estimatedDurationsSeconds": {
          "deposit": 67.2,
          "egress": 96,
          "swap": 12,
        },
        "fees": [
          {
            "amount": "0",
            "asset": "SOL",
            "chain": "Solana",
            "type": "INGRESS",
          },
        ],
        "srcAsset": "SOL",
        "srcChain": "Solana",
        "srcChainRequiredBlockConfirmations": 2,
        "state": "COMPLETED",
        "swap": {
          "originalInputAmount": "17000000",
          "regular": {
            "executedAt": 564000,
            "executedBlockIndex": "94-594",
            "inputAmount": "17000000",
            "intermediateAmount": "5000000",
            "outputAmount": "5000000000000000000",
            "retryCount": 0,
            "scheduledAt": 552000,
            "scheduledBlockIndex": "92-399",
          },
          "remainingInputAmount": "0",
          "swappedInputAmount": "17000000",
          "swappedIntermediateAmount": "5000000",
          "swappedOutputAmount": "5000000000000000000",
        },
        "swapId": "368",
      }
    `);
  });

  it('gets the swap info by swap request id', async () => {
    await processEvents(events, [], '200');

    const { body, status } = await request(server).get(`/v2/swaps/368`);

    expect(status).toBe(200);
    expect(body).toMatchInlineSnapshot(`
      {
        "brokers": [],
        "deposit": {
          "amount": "10000000000",
          "witnessedAt": 552000,
          "witnessedBlockIndex": "92-400",
        },
        "depositChannel": {
          "createdAt": 516000,
          "depositAddress": "4Az8dFA8ugjcx791yEW4gWKuNoPEw6cPC83Hr64Q5TwH",
          "id": "86-Solana-85",
          "isExpired": false,
          "liquidityProvider": "cFPbJHHG2U2Jn8DUx6kVAH8AEUGHN76Gsq8q39CkUr64hsRH4",
          "openedThroughBackend": false,
          "srcChainExpiryBlock": "265",
        },
        "destAsset": "FLIP",
        "destChain": "Ethereum",
        "estimatedDurationSeconds": 175.2,
        "estimatedDurationsSeconds": {
          "deposit": 67.2,
          "egress": 96,
          "swap": 12,
        },
        "fees": [
          {
            "amount": "0",
            "asset": "SOL",
            "chain": "Solana",
            "type": "INGRESS",
          },
        ],
        "srcAsset": "SOL",
        "srcChain": "Solana",
        "srcChainRequiredBlockConfirmations": 2,
        "state": "COMPLETED",
        "swap": {
          "originalInputAmount": "17000000",
          "regular": {
            "executedAt": 564000,
            "executedBlockIndex": "94-594",
            "inputAmount": "17000000",
            "intermediateAmount": "5000000",
            "outputAmount": "5000000000000000000",
            "retryCount": 0,
            "scheduledAt": 552000,
            "scheduledBlockIndex": "92-399",
          },
          "remainingInputAmount": "0",
          "swappedInputAmount": "17000000",
          "swappedIntermediateAmount": "5000000",
          "swappedOutputAmount": "5000000000000000000",
        },
        "swapId": "368",
      }
    `);
  });
});
