import axios from 'axios';
import * as broker from '../broker';
import { Assets } from '../enums';

describe(broker.requestSwapDepositAddress, () => {
  const brokerConfig = {
    url: 'https://example.com',
    commissionBps: 0,
  };
  const postSpy = jest.spyOn(axios, 'post').mockRejectedValue(Error('unhandled mock'));

  const MOCKED_RESPONSE = {
    result: {
      address: '0x31E9b3373F2AD5d964CAd0fd01332d6550cBBdE6',
      issued_block: 50,
      channel_id: 200,
      source_chain_expiry_block: 1_000_000,
    },
  };
  const mockResponse = (data: Record<string, any> = MOCKED_RESPONSE) =>
    postSpy.mockResolvedValueOnce({
      data: {
        id: 1,
        jsonrpc: '2.0',
        ...data,
      },
    });

  it('gets a response from the broker', async () => {
    mockResponse();
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: Assets.FLIP,
        destAsset: Assets.USDC,
        srcChain: 'Ethereum',
        destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
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
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        0,
        undefined,
        undefined,
      ],
    });
    expect(result).toStrictEqual({
      address: '0x31E9b3373F2AD5d964CAd0fd01332d6550cBBdE6',
      issuedBlock: 50,
      channelId: 200n,
      sourceChainExpiryBlock: 1_000_000n,
      channelOpeningFee: 0n,
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
        undefined,
        undefined,
      ],
    });
    expect(result).toStrictEqual({
      address: '0x31E9b3373F2AD5d964CAd0fd01332d6550cBBdE6',
      issuedBlock: 50,
      channelId: 200n,
      sourceChainExpiryBlock: 1_000_000n,
      channelOpeningFee: 0n,
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
        destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
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
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        0,
        {
          cf_parameters: undefined,
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
        },
        undefined,
      ],
    });
    expect(result).toStrictEqual({
      address: '0x31E9b3373F2AD5d964CAd0fd01332d6550cBBdE6',
      issuedBlock: 50,
      channelId: 200n,
      sourceChainExpiryBlock: 1_000_000n,
      channelOpeningFee: 0n,
    });
  });

  it('submits boost fee', async () => {
    mockResponse();
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: Assets.FLIP,
        destAsset: Assets.USDC,
        srcChain: 'Ethereum',
        destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        destChain: 'Ethereum',
        ccmMetadata: {
          gasBudget: '123456789',
          message: '0xdeadc0de',
        },
        maxBoostFeeBps: 100,
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
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
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
      address: '0x31E9b3373F2AD5d964CAd0fd01332d6550cBBdE6',
      issuedBlock: 50,
      channelId: 200n,
      sourceChainExpiryBlock: 1_000_000n,
      channelOpeningFee: 0n,
    });
  });

  it('submits broker commission', async () => {
    mockResponse();
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: Assets.FLIP,
        destAsset: Assets.USDC,
        srcChain: 'Ethereum',
        destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        destChain: 'Ethereum',
        ccmMetadata: {
          gasBudget: '123456789',
          message: '0xdeadc0de',
        },
        maxBoostFeeBps: 100,
      },
      { ...brokerConfig, commissionBps: 25 },
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
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        25,
        {
          cf_parameters: undefined,
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
        },
        100,
      ],
    });
    expect(result).toStrictEqual({
      address: '0x31E9b3373F2AD5d964CAd0fd01332d6550cBBdE6',
      issuedBlock: 50,
      channelId: 200n,
      sourceChainExpiryBlock: 1_000_000n,
      channelOpeningFee: 0n,
    });
  });

  it('submits affiliate brokers', async () => {
    mockResponse();
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: Assets.FLIP,
        destAsset: Assets.USDC,
        srcChain: 'Ethereum',
        destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        destChain: 'Ethereum',
        ccmMetadata: {
          gasBudget: '123456789',
          message: '0xdeadc0de',
        },
        maxBoostFeeBps: 100,
      },
      {
        ...brokerConfig,
        commissionBps: 30,
        affiliates: [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', commissionBps: 10 },
          { account: 'cFJ4sqrg4FnrLPsGdt5w85XExGYxVLHLYLci28PnqcVVb8r8a', commissionBps: 20 },
        ],
      },
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
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        30,
        {
          cf_parameters: undefined,
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
        },
        100,
        [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', bps: 10 },
          { account: 'cFJ4sqrg4FnrLPsGdt5w85XExGYxVLHLYLci28PnqcVVb8r8a', bps: 20 },
        ],
      ],
    });
    expect(result).toStrictEqual({
      address: '0x31E9b3373F2AD5d964CAd0fd01332d6550cBBdE6',
      issuedBlock: 50,
      channelId: 200n,
      sourceChainExpiryBlock: 1_000_000n,
      channelOpeningFee: 0n,
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
          destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
          destChain: 'Ethereum',
        },
        brokerConfig,
        'perseverance',
      ),
    ).rejects.toThrowError('Broker responded with error code -1: error message');
  });
});
