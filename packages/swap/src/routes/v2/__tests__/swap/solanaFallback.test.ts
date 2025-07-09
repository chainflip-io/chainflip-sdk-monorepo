import { Server } from 'http';
import { BroadcastSuccessArgsMap } from 'packages/swap/src/event-handlers/broadcaster/broadcastSuccess.js';
import { BatchBroadcastRequestedArgsMap } from 'packages/swap/src/event-handlers/ingress-egress/batchBroadcastRequested.js';
import { CcmBroadcastRequestedArgsMap } from 'packages/swap/src/event-handlers/ingress-egress/ccmBroadcastRequested.js';
import { DepositFinalisedArgsMap } from 'packages/swap/src/event-handlers/ingress-egress/depositFinalised.js';
import { TransferFallbackRequestedArgsMap } from 'packages/swap/src/event-handlers/ingress-egress/transferFallbackRequested.js';
import { SwapDepositAddressReadyArgs } from 'packages/swap/src/event-handlers/swapping/swapDepositAddressReady.js';
import { SwapEgressScheduledArgs } from 'packages/swap/src/event-handlers/swapping/swapEgressScheduled.js';
import { SwapExecutedArgs } from 'packages/swap/src/event-handlers/swapping/swapExecuted.js';
import { SwapRequestedArgs } from 'packages/swap/src/event-handlers/swapping/swapRequested.js';
import { SwapScheduledArgs } from 'packages/swap/src/event-handlers/swapping/swapScheduled.js';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures.js';
import prisma from '../../../../client.js';
import { check, createPools, processEvents } from '../../../../event-handlers/__tests__/utils.js';
import app from '../../../../server.js';

describe('solana fallback requested', () => {
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
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", private."DepositChannel", "Pool", "Egress", "Broadcast", "ChainTracking" CASCADE`;
    await createPools();
  });

  it('handles solana fallback requested', async () => {
    await processEvents([
      {
        id: '0007666730-001312-8a780',
        name: 'Swapping.SwapDepositAddressReady',
        indexInBlock: 1312,
        args: check<SwapDepositAddressReadyArgs>({
          boostFee: 0,
          brokerId: '0x60d8b0c8510bd2b194fd5c9c349b8f7a8e369a18bd15caefd30617663b698214',
          channelId: '2530',
          sourceAsset: { __kind: 'Eth' },
          affiliateFees: [
            {
              bps: 0,
              account: '0x042ff8b42079c9365bd04f53b41dddf07862d27ba02e9c2d4da1488201e19711',
            },
          ],
          depositAddress: { value: '0xd9eb2ee687ac11ee8dc858964573e065d981aac4', __kind: 'Eth' },
          channelMetadata: {
            message: '0x0100000011016400013b536408000000002c01',
            gasBudget: '6291456',
            ccmAdditionalData:
              '0x0045e9136fba3a391ae1e02feec01acede10c22cc56f8a1d3af90c9acf5a40d32300683e13ef5ddf3682d6320ae91c1ae347fb891d0d160d2f36eca9a8000b6e24aa060020da3e45f8db753866bcf2fd9719e7fd8e1bc0b6f22f74da978bb3053a32e4060134aa939a0548063e88d43118f3bd4a146507e88b498b767c3c6e73b61ca9ca740106ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a90085578e588c1839964467d8597afa5c7f0e2b4126dd0ec2c6c109ea9aea4774fe018c97258f4e2489f1bb3d1029148e0d830b5a1399daff1084048e7bd8dbe9f85900c5f9fb32f49111ab20c33f2598fc836c113e291881ac21ee29169394011244e4002a524390a39632941f28f8b1cd8126d4229e1e43cb5ff3314fea124df1cd4a5501ecd96d95c8dc385f2f7272950ece36fb411fc82f090e212a9e19b057361cd60e010479d55bf231c06eee74c56ece681507fdb1b2dea3f48e5102b1cda256bc138f00069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001000479d55bf231c06eee74c56ece681507fdb1b2dea3f48e5102b1cda256bc138f000479d55bf231c06eee74c56ece681507fdb1b2dea3f48e5102b1cda256bc138f00b43ffa27f5d7f64a74c09b1f295879de4b09ab36dfc9dd514b321aa7b38ce5e8000e03685f8e909053e458121c66f5a76aedc7706aa11c82f8aa952a8f2b7879a90006ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a900ca936a1c4235887618bab2c15f59233b50d593072cbac1eec07856a41b501e3700b3ac999f734c896b8d2ff41464d44b7b2c03bf0f3a625242b65ad9f43ddd68c60185578e588c1839964467d8597afa5c7f0e2b4126dd0ec2c6c109ea9aea4774fe015a83c2016ee4f94bbdcdaf7ca664f8dba36e60bbbc0bb3252d75af7c0385f29901ecd96d95c8dc385f2f7272950ece36fb411fc82f090e212a9e19b057361cd60e0107596e2bcda82c35c9493b009dc009b26826b24ffeaa4bbccabd42c42f847b6401cb665b9b368eabaaf794e18a508fb42239914802360976531f5b0ee51b6e59b7014056de1d34efab75b5294867037bd340927919b2f150a56851604c347df5b024016724bcfcb9600c5d82d9f00b49cadd842a7468f20d0c13190fe91c1cb43230b0010aa8ab583cfcdb430ccaa52cee9ee4cd8ae8d5ccd9015018a6a52eb9ffdb7ac6002a524390a39632941f28f8b1cd8126d4229e1e43cb5ff3314fea124df1cd4a55',
          },
          destinationAsset: { __kind: 'Sol' },
          refundParameters: {
            minPrice: '929439471347296211638784360448',
            refundAddress: { value: '0x47a7c49be51658119740d2c9b93d1aa858c44d63', __kind: 'Eth' },
            retryDuration: 150,
          },
          channelOpeningFee: '0',
          destinationAddress: {
            value: '0xca936a1c4235887618bab2c15f59233b50d593072cbac1eec07856a41b501e37',
            __kind: 'Sol',
          },
          brokerCommissionRate: 20,
          sourceChainExpiryBlock: '22405194',
        }),
      },
      {
        id: '0007666752-001046-5e8ca',
        name: 'Swapping.SwapRequested',
        indexInBlock: 1046,
        args: check<SwapRequestedArgs>({
          origin: {
            __kind: 'DepositChannel',
            brokerId: '0x60d8b0c8510bd2b194fd5c9c349b8f7a8e369a18bd15caefd30617663b698214',
            channelId: '2530',
            depositAddress: { value: '0xd9eb2ee687ac11ee8dc858964573e065d981aac4', __kind: 'Eth' },
            depositBlockHeight: '22399026',
          },
          brokerFees: [
            {
              bps: 20,
              account: '0x60d8b0c8510bd2b194fd5c9c349b8f7a8e369a18bd15caefd30617663b698214',
            },
          ],
          inputAsset: { __kind: 'Eth' },
          inputAmount: '49981500000000000',
          outputAsset: { __kind: 'Sol' },
          requestType: {
            __kind: 'Regular',
            outputAction: {
              __kind: 'Egress',
              outputAddress: {
                value: '0xca936a1c4235887618bab2c15f59233b50d593072cbac1eec07856a41b501e37',
                __kind: 'Sol',
              },
              ccmDepositMetadata: {
                sourceChain: { __kind: 'Ethereum' },
                channelMetadata: {
                  message: '0x0100000011016400013b536408000000002c01',
                  gasBudget: '6291456',
                  ccmAdditionalData:
                    '0x0045e9136fba3a391ae1e02feec01acede10c22cc56f8a1d3af90c9acf5a40d32300683e13ef5ddf3682d6320ae91c1ae347fb891d0d160d2f36eca9a8000b6e24aa060020da3e45f8db753866bcf2fd9719e7fd8e1bc0b6f22f74da978bb3053a32e4060134aa939a0548063e88d43118f3bd4a146507e88b498b767c3c6e73b61ca9ca740106ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a90085578e588c1839964467d8597afa5c7f0e2b4126dd0ec2c6c109ea9aea4774fe018c97258f4e2489f1bb3d1029148e0d830b5a1399daff1084048e7bd8dbe9f85900c5f9fb32f49111ab20c33f2598fc836c113e291881ac21ee29169394011244e4002a524390a39632941f28f8b1cd8126d4229e1e43cb5ff3314fea124df1cd4a5501ecd96d95c8dc385f2f7272950ece36fb411fc82f090e212a9e19b057361cd60e010479d55bf231c06eee74c56ece681507fdb1b2dea3f48e5102b1cda256bc138f00069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001000479d55bf231c06eee74c56ece681507fdb1b2dea3f48e5102b1cda256bc138f000479d55bf231c06eee74c56ece681507fdb1b2dea3f48e5102b1cda256bc138f00b43ffa27f5d7f64a74c09b1f295879de4b09ab36dfc9dd514b321aa7b38ce5e8000e03685f8e909053e458121c66f5a76aedc7706aa11c82f8aa952a8f2b7879a90006ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a900ca936a1c4235887618bab2c15f59233b50d593072cbac1eec07856a41b501e3700b3ac999f734c896b8d2ff41464d44b7b2c03bf0f3a625242b65ad9f43ddd68c60185578e588c1839964467d8597afa5c7f0e2b4126dd0ec2c6c109ea9aea4774fe015a83c2016ee4f94bbdcdaf7ca664f8dba36e60bbbc0bb3252d75af7c0385f29901ecd96d95c8dc385f2f7272950ece36fb411fc82f090e212a9e19b057361cd60e0107596e2bcda82c35c9493b009dc009b26826b24ffeaa4bbccabd42c42f847b6401cb665b9b368eabaaf794e18a508fb42239914802360976531f5b0ee51b6e59b7014056de1d34efab75b5294867037bd340927919b2f150a56851604c347df5b024016724bcfcb9600c5d82d9f00b49cadd842a7468f20d0c13190fe91c1cb43230b0010aa8ab583cfcdb430ccaa52cee9ee4cd8ae8d5ccd9015018a6a52eb9ffdb7ac6002a524390a39632941f28f8b1cd8126d4229e1e43cb5ff3314fea124df1cd4a55',
                },
              },
            },
          },
          swapRequestId: '484522',
          refundParameters: {
            minPrice: '929439471347296211638784360448',
            refundDestination: {
              __kind: 'ExternalAddress',
              value: {
                __kind: 'Eth',
                value: '0x47a7c49be51658119740d2c9b93d1aa858c44d63',
              },
            },
            retryDuration: 150,
          },
        }),
      },
      {
        id: '0007666752-001047-5e8ca',
        name: 'Swapping.SwapScheduled',
        indexInBlock: 1047,
        args: check<SwapScheduledArgs>({
          swapId: '705194',
          swapType: { __kind: 'Swap' },
          executeAt: 7666754,
          inputAmount: '49981500000000000',
          swapRequestId: '484522',
        }),
      },
      {
        id: '0007666752-001048-5e8ca',
        name: 'EthereumIngressEgress.DepositFinalised',
        indexInBlock: 1048,
        args: check<DepositFinalisedArgsMap['Ethereum']>({
          asset: { __kind: 'Eth' },
          action: { __kind: 'Swap', swapRequestId: '484522' },
          amount: '50000000000000000',
          channelId: '2530',
          ingressFee: '18500000000000',
          originType: { __kind: 'DepositChannel' },
          blockHeight: '22399026',
          depositAddress: '0xd9eb2ee687ac11ee8dc858964573e065d981aac4',
          depositDetails: {
            txHashes: ['0xcddddb2355809a0957a28f1040a552b691953792e84bb015217c923876058c01'],
          },
          maxBoostFeeBps: 0,
        }),
      },
      {
        id: '0007666754-001791-cebd1',
        name: 'Swapping.SwapExecuted',
        indexInBlock: 1791,
        args: check<SwapExecutedArgs>({
          swapId: '705194',
          brokerFee: '182272',
          inputAsset: { __kind: 'Eth' },
          networkFee: '500000',
          inputAmount: '49981500000000000',
          outputAsset: { __kind: 'Sol' },
          outputAmount: '614897437',
          swapRequestId: '484522',
          intermediateAmount: '90953757',
        }),
      },
      {
        id: '0007666754-001792-cebd1',
        name: 'Swapping.SwapEgressScheduled',
        indexInBlock: 1792,
        args: check<SwapEgressScheduledArgs>({
          asset: { __kind: 'Sol' },
          amount: '608892437',
          egressId: [{ __kind: 'Solana' }, '28817'],
          egressFee: ['6005000', { __kind: 'Sol' }],
          swapRequestId: '484522',
        }),
      },
      {
        id: '0007666754-001793-cebd1',
        name: 'Swapping.SwapRequestCompleted',
        indexInBlock: 1793,
        args: { swapRequestId: '484522' },
      },
      {
        id: '0007666754-001795-cebd1',
        name: 'SolanaIngressEgress.CcmBroadcastRequested',
        indexInBlock: 1795,
        args: check<CcmBroadcastRequestedArgsMap['Solana']>({
          egressId: [{ __kind: 'Solana' }, '28817'],
          broadcastId: 49098,
        }),
      },
      {
        id: '0007666783-001338-ca958',
        name: 'SolanaIngressEgress.TransferFallbackRequested',
        indexInBlock: 1338,
        args: check<TransferFallbackRequestedArgsMap['Solana']>({
          asset: { __kind: 'Sol' },
          amount: '608892437',
          broadcastId: 49098,
          egressDetails: {
            egressId: [{ __kind: 'Solana' }, '28819'],
            feeWithheld: '14000',
            egressAmount: '608878437',
          },
          destinationAddress: '0x2a524390a39632941f28f8b1cd8126d4229e1e43cb5ff3314fea124df1cd4a55',
        }),
      },
      {
        id: '0007666783-001340-ca958',
        name: 'SolanaBroadcaster.BroadcastSuccess',
        indexInBlock: 1340,
        args: check<BroadcastSuccessArgsMap['Solana']>({
          broadcastId: 49098,
          transactionRef:
            '0x96509cd8ec56893ff3e0de6efd45bf69f2da00e81c6a813470e1df835bce177ac3934e5d33a8b8cd8750ad99de5c06f8c8a08856940ac5bf1f3f5cf3584b0c0f',
          transactionOutId:
            '0x96509cd8ec56893ff3e0de6efd45bf69f2da00e81c6a813470e1df835bce177ac3934e5d33a8b8cd8750ad99de5c06f8c8a08856940ac5bf1f3f5cf3584b0c0f',
        }),
      },
      {
        id: '0007666783-001342-ca958',
        name: 'SolanaIngressEgress.BatchBroadcastRequested',
        indexInBlock: 1342,
        args: check<BatchBroadcastRequestedArgsMap['Solana']>({
          egressIds: [[{ __kind: 'Solana' }, '28819']],
          broadcastId: 49100,
        }),
      },
      {
        id: '0007666812-000762-8c3ed',
        name: 'SolanaBroadcaster.BroadcastSuccess',
        indexInBlock: 762,
        args: check<BroadcastSuccessArgsMap['Solana']>({
          broadcastId: 49100,
          transactionRef:
            '0xab3352a4162d1f0f7cd93c7fe473d6bb1625871b731b09ee6d74a2cabf370d9ccba8c3d074ed31bd637ed1798e001e77126d92d66829a22ef50c60879c469407',
          transactionOutId:
            '0xab3352a4162d1f0f7cd93c7fe473d6bb1625871b731b09ee6d74a2cabf370d9ccba8c3d074ed31bd637ed1798e001e77126d92d66829a22ef50c60879c469407',
        }),
      },
    ]);

    expect(
      await prisma.swapRequest.findFirstOrThrow({
        include: {
          egress: {
            include: {
              broadcast: true,
            },
          },
          fallbackEgress: {
            include: {
              broadcast: true,
            },
          },
        },
      }),
    ).toMatchInlineSnapshot(
      {
        id: expect.any(BigInt),
        swapDepositChannelId: expect.any(BigInt),
        egressId: expect.any(BigInt),
        fallbackEgressId: expect.any(BigInt),
        egress: {
          id: expect.any(BigInt),
          fallbackDestinationAddress: null,
          broadcastId: expect.any(BigInt),
          broadcast: {
            id: expect.any(BigInt),
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        },
        fallbackEgress: {
          id: expect.any(BigInt),
          broadcastId: expect.any(BigInt),
          broadcast: {
            id: expect.any(BigInt),
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        },
      },
      `
      {
        "ccmGasBudget": "6291456",
        "ccmMessage": "0x0100000011016400013b536408000000002c01",
        "completedAt": 1971-06-17T09:55:24.000Z,
        "completedBlockIndex": "7666754-1793",
        "dcaChunkIntervalBlocks": null,
        "dcaNumberOfChunks": null,
        "depositAmount": "50000000000000000",
        "depositBoostedAt": null,
        "depositBoostedBlockIndex": null,
        "depositFinalisedAt": 1971-06-17T09:55:12.000Z,
        "depositFinalisedBlockIndex": "7666752-1048",
        "depositTransactionRef": "0xcddddb2355809a0957a28f1040a552b691953792e84bb015217c923876058c01",
        "destAddress": "EdmjHbx1mirAeWTnsLhVx24p1nTsdoxuEJBHJijcmT7c",
        "destAsset": "Sol",
        "effectiveBoostFeeBps": null,
        "egress": {
          "amount": "608892437",
          "broadcast": {
            "abortedAt": null,
            "abortedBlockIndex": null,
            "chain": "Solana",
            "createdAt": Any<Date>,
            "id": Any<BigInt>,
            "nativeId": 49098n,
            "replacedById": null,
            "requestedAt": 1971-06-17T09:55:24.000Z,
            "requestedBlockIndex": "7666754-1795",
            "succeededAt": 1971-06-17T09:58:18.000Z,
            "succeededBlockIndex": "7666783-1340",
            "transactionPayload": null,
            "transactionRef": "41JkSkQbjUiUNtmXcaAipy7oTBKJfhTcTgWgRUfQZE1L9hiszzQXogjj5mgKyw9j5Vrrcc2HjofR8bqHC66KJXrN",
            "updatedAt": Any<Date>,
          },
          "broadcastId": Any<BigInt>,
          "chain": "Solana",
          "fallbackDestinationAddress": null,
          "id": Any<BigInt>,
          "nativeId": 28817n,
          "scheduledAt": 1971-06-17T09:55:24.000Z,
          "scheduledBlockIndex": "7666754-1792",
        },
        "egressId": Any<BigInt>,
        "fallbackEgress": {
          "amount": "608878437",
          "broadcast": {
            "abortedAt": null,
            "abortedBlockIndex": null,
            "chain": "Solana",
            "createdAt": Any<Date>,
            "id": Any<BigInt>,
            "nativeId": 49100n,
            "replacedById": null,
            "requestedAt": 1971-06-17T09:58:18.000Z,
            "requestedBlockIndex": "7666783-1342",
            "succeededAt": 1971-06-17T10:01:12.000Z,
            "succeededBlockIndex": "7666812-762",
            "transactionPayload": null,
            "transactionRef": "4RXTKNG5FiikbNVY9jpQUXFdCAmwxHuhv6pqmX2Yb9dEgjkyCUsjxmDoB1wFuFNZKohDyLTHdr1NGm95zRVwVJ4v",
            "updatedAt": Any<Date>,
          },
          "broadcastId": Any<BigInt>,
          "chain": "Solana",
          "fallbackDestinationAddress": "3rCsvPRapbPL1GNCeatESyMd5AWZeDjc8DbSfhGJRmJU",
          "id": Any<BigInt>,
          "nativeId": 28819n,
          "scheduledAt": 1971-06-17T09:58:18.000Z,
          "scheduledBlockIndex": "7666783-1338",
        },
        "fallbackEgressId": Any<BigInt>,
        "fokMinPriceX128": "9.29439471347296211638784360448e+29",
        "fokRefundAddress": "0x47a7c49be51658119740d2c9b93d1aa858c44d63",
        "fokRetryDurationBlocks": 150,
        "id": Any<BigInt>,
        "maxBoostFeeBps": 0,
        "nativeId": 484522n,
        "originType": "DEPOSIT_CHANNEL",
        "prewitnessedDepositId": null,
        "refundEgressId": null,
        "requestType": "REGULAR",
        "srcAddress": null,
        "srcAsset": "Eth",
        "swapDepositChannelId": Any<BigInt>,
        "swapInputAmount": "49981500000000000",
        "swapOutputAmount": "614897437",
        "swapRequestedAt": 1971-06-17T09:55:12.000Z,
        "swapRequestedBlockIndex": "7666752-1046",
        "totalBrokerCommissionBps": 20,
      }
    `,
    );

    const { body } = await request(server).get('/v2/swaps/484522');

    expect(body).toMatchInlineSnapshot(`
      {
        "brokers": [
          {
            "account": "cFL4To8Uow6B1hk4dNrhWhvKpkBtnUTrVdWCEKCaXiXMMztjM",
            "commissionBps": 20,
          },
        ],
        "ccmParams": {
          "gasBudget": "6291456",
          "message": "0x0100000011016400013b536408000000002c01",
        },
        "deposit": {
          "amount": "50000000000000000",
          "txRef": "0xcddddb2355809a0957a28f1040a552b691953792e84bb015217c923876058c01",
          "witnessedAt": 46000512000,
          "witnessedBlockIndex": "7666752-1048",
        },
        "depositChannel": {
          "affiliateBrokers": [],
          "brokerCommissionBps": 20,
          "createdAt": 46000380000,
          "depositAddress": "0xd9eb2ee687ac11ee8dc858964573e065d981aac4",
          "fillOrKillParams": {
            "minPrice": "2.73137712",
            "refundAddress": "0x47a7c49be51658119740d2c9b93d1aa858c44d63",
            "retryDurationBlocks": 150,
          },
          "id": "7666730-Ethereum-2530",
          "isExpired": false,
          "openedThroughBackend": false,
          "srcChainExpiryBlock": "22405194",
        },
        "destAddress": "EdmjHbx1mirAeWTnsLhVx24p1nTsdoxuEJBHJijcmT7c",
        "destAsset": "SOL",
        "destChain": "Solana",
        "estimatedDurationSeconds": 126.4,
        "estimatedDurationsSeconds": {
          "deposit": 24,
          "egress": 90.4,
          "swap": 12,
        },
        "fallbackEgress": {
          "amount": "608878437",
          "destinationAddress": "3rCsvPRapbPL1GNCeatESyMd5AWZeDjc8DbSfhGJRmJU",
          "scheduledAt": 46000698000,
          "scheduledBlockIndex": "7666783-1338",
          "txRef": "4RXTKNG5FiikbNVY9jpQUXFdCAmwxHuhv6pqmX2Yb9dEgjkyCUsjxmDoB1wFuFNZKohDyLTHdr1NGm95zRVwVJ4v",
          "witnessedAt": 46000872000,
          "witnessedBlockIndex": "7666812-762",
        },
        "fees": [
          {
            "amount": "500000",
            "asset": "USDC",
            "chain": "Ethereum",
            "type": "NETWORK",
          },
          {
            "amount": "182272",
            "asset": "USDC",
            "chain": "Ethereum",
            "type": "BROKER",
          },
          {
            "amount": "18500000000000",
            "asset": "ETH",
            "chain": "Ethereum",
            "type": "INGRESS",
          },
          {
            "amount": "6019000",
            "asset": "SOL",
            "chain": "Solana",
            "type": "EGRESS",
          },
        ],
        "fillOrKillParams": {
          "minPrice": "2.73137712",
          "refundAddress": "0x47a7c49be51658119740d2c9b93d1aa858c44d63",
          "retryDurationBlocks": 150,
        },
        "srcAsset": "ETH",
        "srcChain": "Ethereum",
        "srcChainRequiredBlockConfirmations": 2,
        "state": "FAILED",
        "swap": {
          "originalInputAmount": "49981500000000000",
          "regular": {
            "executedAt": 46000524000,
            "executedBlockIndex": "7666754-1791",
            "inputAmount": "49981500000000000",
            "intermediateAmount": "90953757",
            "outputAmount": "614897437",
            "retryCount": 0,
            "scheduledAt": 46000512000,
            "scheduledBlockIndex": "7666752-1047",
          },
          "remainingInputAmount": "0",
          "swappedInputAmount": "49981500000000000",
          "swappedIntermediateAmount": "90953757",
          "swappedOutputAmount": "614897437",
        },
        "swapEgress": {
          "amount": "608892437",
          "scheduledAt": 46000524000,
          "scheduledBlockIndex": "7666754-1792",
          "txRef": "41JkSkQbjUiUNtmXcaAipy7oTBKJfhTcTgWgRUfQZE1L9hiszzQXogjj5mgKyw9j5Vrrcc2HjofR8bqHC66KJXrN",
          "witnessedAt": 46000698000,
          "witnessedBlockIndex": "7666783-1340",
        },
        "swapId": "484522",
      }
    `);
  });
});
