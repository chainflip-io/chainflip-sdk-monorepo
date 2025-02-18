import { describe, it, expect } from 'vitest';
import { Chain } from '@/shared/enums';
import { BroadcastType } from '@/swap/client';
import { Prisma } from '../../../client';
import { getEgressStatusFields } from '../../v2/utils';

describe(getEgressStatusFields, () => {
  const mockTransactionPayload = JSON.stringify({
    data: '0x5f8c0f9a6715e506dab026be6892ad1ecec48ce16fd9eacb3683de07294d9e30d62fd81e00000000000000000000000000000000000000000000000000000000000003f4000000000000000000000000787c09c2384ee191d0916629990b3408306fa4e200000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000826180541412d574cf1336d22c0c0a287822678a00000000000000000000000080d221b17bdc13c910d54ea85909269bae2ae08f0000000000000000000000000000000000000000000000072119b99295e7a901',
    value: '0',
    chainId: '1',
    contract: '0xf5e10380213880111522dd0efd3dbb45b9f62bcc',
    maxFeePerGas: '159067749356',
    maxPriorityFeePerGas: '99000000',
  });

  const mockEgress = {
    id: 1009n,
    nativeId: 19n,
    chain: 'Ethereum' as Chain,
    amount: new Prisma.Decimal(4192707216034),
    scheduledAt: new Date('1970-01-01T00:09:24.000Z'),
    scheduledBlockIndex: '94-595',
    broadcastId: 727n,
    createdAt: new Date('2025-02-17T14:03:32.056Z'),
    updatedAt: new Date('2025-02-17T14:03:32.065Z'),
    broadcast: {
      id: 727n,
      nativeId: 7n,
      chain: 'Ethereum' as Chain,
      type: 'BATCH' as BroadcastType,
      requestedAt: new Date('1970-01-01T00:09:24.000Z'),
      requestedBlockIndex: '94-843',
      succeededAt: null,
      succeededBlockIndex: null,
      abortedAt: new Date('1970-01-01T00:10:24.000Z'),
      abortedBlockIndex: '104-7',
      transactionPayload: mockTransactionPayload,
      replacedById: null,
      transactionRef: '104-2',
      createdAt: new Date('2025-02-17T14:03:32.064Z'),
      updatedAt: new Date('2025-02-17T14:03:32.085Z'),
    },
  };

  it('parses the payload params if the swap is aborted', async () => {
    const egressStatus = await getEgressStatusFields(mockEgress, undefined, undefined, undefined);

    expect(egressStatus).toMatchInlineSnapshot(`
      {
        "amount": "4192707216034",
        "failedAt": 624000,
        "failedBlockIndex": "104-7",
        "failure": {
          "failedAt": 624000,
          "failedBlockIndex": "104-7",
          "mode": "SENDING_FAILED",
          "reason": {
            "message": "The refund broadcast was aborted",
            "name": "BroadcastAborted",
          },
        },
        "scheduledAt": 564000,
        "scheduledBlockIndex": "94-595",
        "transactionPayload": "{"data":"0x5f8c0f9a6715e506dab026be6892ad1ecec48ce16fd9eacb3683de07294d9e30d62fd81e00000000000000000000000000000000000000000000000000000000000003f4000000000000000000000000787c09c2384ee191d0916629990b3408306fa4e200000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000826180541412d574cf1336d22c0c0a287822678a00000000000000000000000080d221b17bdc13c910d54ea85909269bae2ae08f0000000000000000000000000000000000000000000000072119b99295e7a901","value":"0","chainId":"1","contract":"0xf5e10380213880111522dd0efd3dbb45b9f62bcc"}",
        "txRef": "104-2",
        "witnessedAt": undefined,
        "witnessedBlockIndex": undefined,
      }
    `);
  });

  it('does not parse payload params if the swap is successful', async () => {
    const successfulEgress = {
      ...mockEgress,
      broadcast: {
        ...mockEgress.broadcast,
        succeededAt: new Date('1970-01-01T00:10:24.000Z'),
        succeededBlockIndex: '104-7',
        abortedAt: null,
        abortedBlockIndex: null,
      },
    };

    const egressStatus = await getEgressStatusFields(
      successfulEgress,
      undefined,
      undefined,
      undefined,
    );
    expect(egressStatus?.transactionPayload).toMatch(successfulEgress.broadcast.transactionPayload);
  });
});
