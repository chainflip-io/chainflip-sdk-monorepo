import axios from 'axios';
import * as broker from '../broker';
import { Assets } from '../enums';

describe(broker.requestSwapDepositAddress, () => {
  const brokerConfig = {
    url: 'https://example.com',
    commissionBps: 0,
  };
  const postSpy = jest
    .spyOn(axios, 'post')
    .mockRejectedValue(Error('unhandled mock'));

  const mockResponse = (data: unknown) =>
    postSpy.mockResolvedValueOnce({ data });

  it('gets a response from the broker', async () => {
    mockResponse({
      id: 1,
      jsonrpc: '2.0',
      result: {
        address: '0x1234567890',
        issued_block: 50,
        channel_id: 200,
        source_chain_expiry_block: 1_000_000,
      },
    });
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: Assets.FLIP,
        destAsset: Assets.USDC,
        srcChain: 'Ethereum',
        destAddress: '0xcafebabe',
        destChain: 'Ethereum',
      },
      brokerConfig,
    );
    expect(postSpy.mock.calls[0][0]).toBe(brokerConfig.url);
    const requestObject = postSpy.mock.calls[0][1];
    expect(requestObject).toStrictEqual({
      id: 1,
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: ['Flip', 'Usdc', '0xcafebabe', 0],
    });
    expect(result).toStrictEqual({
      address: '0x1234567890',
      issuedBlock: 50,
      channelId: 200n,
      sourceChainExpiryBlock: 1_000_000n,
    });
  });

  it('submits ccm data', async () => {
    mockResponse({
      id: 1,
      jsonrpc: '2.0',
      result: {
        address: '0x1234567890',
        issued_block: 50,
        channel_id: 200,
        source_chain_expiry_block: 1_000_000,
      },
    });
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: Assets.FLIP,
        destAsset: Assets.USDC,
        srcChain: 'Ethereum',
        destAddress: '0xcafebabe',
        destChain: 'Ethereum',
        ccmMetadata: {
          gasBudget: '123456789',
          message: '0xdeadc0de',
        },
      },
      brokerConfig,
    );
    const requestObject = postSpy.mock.calls[0][1];
    expect(requestObject).toStrictEqual({
      id: 1,
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        'Flip',
        'Usdc',
        '0xcafebabe',
        0,
        {
          cf_parameters: undefined,
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
        },
      ],
    });
    expect(result).toStrictEqual({
      address: '0x1234567890',
      issuedBlock: 50,
      channelId: 200n,
      sourceChainExpiryBlock: 1_000_000n,
    });
  });
});
