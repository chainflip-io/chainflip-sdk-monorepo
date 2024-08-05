import * as broker from '../broker';
import { Assets } from '../enums';
import { mockRpcResponse } from '../tests/fixtures';

describe(broker.requestSwapDepositAddress, () => {
  const brokerConfig = {
    url: 'https://example.com',
    commissionBps: 0,
  };

  const MOCKED_RESPONSE = {
    id: '1',
    jsonrpc: '2.0',
    result: {
      address: '0x31E9b3373F2AD5d964CAd0fd01332d6550cBBdE6',
      issued_block: 50,
      channel_id: 200,
      source_chain_expiry_block: 1_000_000,
      channel_opening_fee: '0x0',
    },
  };
  const mockResponse = (data: Record<string, any> = MOCKED_RESPONSE) => mockRpcResponse({ data });

  it('gets a response from the broker', async () => {
    const postSpy = mockResponse();
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
      id: '1',
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        0,
        null,
        null,
        null,
        null,
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
    const postSpy = mockResponse();
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
      id: '1',
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'BTC', chain: 'Bitcoin' },
        '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        0,
        null,
        null,
        null,
        null,
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
    const postSpy = mockResponse();
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
      id: '1',
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        0,
        {
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
        },
        null,
        null,
        null,
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
    const postSpy = mockResponse();
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
      id: '1',
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        0,
        {
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
        },
        100,
        null,
        null,
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
    const postSpy = mockResponse();
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
        commissionBps: 25,
      },
      brokerConfig,
      'perseverance',
    );
    const requestObject = postSpy.mock.calls[0][1];
    expect(requestObject).toStrictEqual({
      id: '1',
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        25,
        {
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
        },
        100,
        null,
        null,
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
    const postSpy = mockResponse();
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
        commissionBps: 30,
        affiliates: [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', commissionBps: 10 },
          { account: 'cFJ4sqrg4FnrLPsGdt5w85XExGYxVLHLYLci28PnqcVVb8r8a', commissionBps: 20 },
        ],
      },
      brokerConfig,
      'perseverance',
    );
    const requestObject = postSpy.mock.calls[0][1];
    expect(requestObject).toStrictEqual({
      id: '1',
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        30,
        {
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
        },
        100,
        [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', bps: 10 },
          { account: 'cFJ4sqrg4FnrLPsGdt5w85XExGYxVLHLYLci28PnqcVVb8r8a', bps: 20 },
        ],
        null,
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

  it('submits refund parameters', async () => {
    const postSpy = mockResponse();
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
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPrice: '10000000000000',
        },
      },
      brokerConfig,
      'perseverance',
    );
    const requestObject = postSpy.mock.calls[0][1];
    expect(requestObject).toStrictEqual({
      id: '1',
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        0,
        {
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
        },
        100,
        null,
        {
          min_price: '0x9184e72a000',
          refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          retry_duration: 500,
        },
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
});
