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

  const MOCKED_RESPONSE = {
    result: {
      address: '0x1234567890',
      issued_block: 50,
      channel_id: 200,
      source_chain_expiry_block: 1_000_000,
    },
  };
  const mockResponse = (data: Record<string, any> = MOCKED_RESPONSE) =>
    postSpy.mockResolvedValueOnce({
      id: 1,
      jsonrpc: '2.0',
      ...data,
    });

  it('gets a response from the broker', async () => {
    mockResponse();
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: Assets.FLIP,
        destAsset: Assets.USDC,
        srcChain: 'Ethereum',
        destAddress: '0xcafebabe',
        destChain: 'Ethereum',
      },
      brokerConfig,
      'perseverance',
    );
    expect(postSpy.mock.calls[0][0]).toBe(brokerConfig.url);
    const requestObject = postSpy.mock.calls[0][1];
    expect(requestObject).toStrictEqual({
      id: 1,
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xcafebabe',
        0,
        null,
        null,
      ],
    });
    expect(result).toStrictEqual({
      address: '0x1234567890',
      issuedBlock: 50,
      channelId: 200n,
      sourceChainExpiryBlock: 1_000_000n,
    });
  });

  it('gets a response from the broker for bitcoin mainnet', async () => {
    mockResponse();
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: Assets.FLIP,
        destAsset: Assets.BTC,
        srcChain: 'Ethereum',
        destAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        destChain: 'Bitcoin',
      },
      brokerConfig,
      'mainnet',
    );
    expect(postSpy.mock.calls[0][0]).toBe(brokerConfig.url);
    const requestObject = postSpy.mock.calls[0][1];
    expect(requestObject).toStrictEqual({
      id: 1,
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'BTC', chain: 'Bitcoin' },
        '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        0,
        null,
        null,
      ],
    });
    expect(result).toStrictEqual({
      address: '0x1234567890',
      issuedBlock: 50,
      channelId: 200n,
      sourceChainExpiryBlock: 1_000_000n,
    });
  });

  it('rejects testnet addresses for bitcoin mainnet', async () => {
    await expect(
      broker.requestSwapDepositAddress(
        {
          srcAsset: Assets.FLIP,
          destAsset: Assets.BTC,
          srcChain: 'Ethereum',
          destAddress: '2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm',
          destChain: 'Bitcoin',
        },
        brokerConfig,
        'mainnet',
      ),
    ).rejects.toThrow();
  });

  it('submits ccm data', async () => {
    mockResponse();
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
      'perseverance',
    );
    const requestObject = postSpy.mock.calls[0][1];
    expect(requestObject).toStrictEqual({
      id: 1,
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xcafebabe',
        0,
        {
          cf_parameters: undefined,
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
        },
        null,
      ],
    });
    expect(result).toStrictEqual({
      address: '0x1234567890',
      issuedBlock: 50,
      channelId: 200n,
      sourceChainExpiryBlock: 1_000_000n,
    });
  });

  it('submits boost fee', async () => {
    mockResponse();
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
        boostFeeBps: 100,
      },
      brokerConfig,
      'perseverance',
    );
    const requestObject = postSpy.mock.calls[0][1];
    expect(requestObject).toStrictEqual({
      id: 1,
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xcafebabe',
        0,
        {
          cf_parameters: undefined,
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
        },
        100,
      ],
    });
    expect(result).toStrictEqual({
      address: '0x1234567890',
      issuedBlock: 50,
      channelId: 200n,
      sourceChainExpiryBlock: 1_000_000n,
    });
  });

  it('formats RPC errors', async () => {
    mockResponse({
      error: {
        code: -1,
        message: 'error message',
        data: 'more information',
      },
    });
    await expect(
      broker.requestSwapDepositAddress(
        {
          srcAsset: Assets.FLIP,
          destAsset: Assets.USDC,
          srcChain: 'Ethereum',
          destAddress: '0xcafebabe',
          destChain: 'Ethereum',
        },
        brokerConfig,
        'perseverance',
      ),
    ).rejects.toThrowError(
      'Broker responded with error code -1: error message',
    );
  });
});
