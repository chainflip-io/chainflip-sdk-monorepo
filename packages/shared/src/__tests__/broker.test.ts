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
        ccmParams: {
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
        ccmParams: {
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
        ccmParams: {
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
        ccmParams: {
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
        ccmParams: {
          gasBudget: '123456789',
          message: '0xdeadc0de',
        },
        maxBoostFeeBps: 100,
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '10000000000000',
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

  it('submits dca parameters', async () => {
    const postSpy = mockResponse();
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: Assets.FLIP,
        destAsset: Assets.USDC,
        srcChain: 'Ethereum',
        destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        destChain: 'Ethereum',
        maxBoostFeeBps: 100,
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '10000000000000',
        },
        dcaParams: {
          numberOfChunks: 100,
          chunkIntervalBlocks: 5,
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
        null,
        100,
        null,
        {
          min_price: '0x9184e72a000',
          refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          retry_duration: 500,
        },
        {
          number_of_chunks: 100,
          chunk_interval: 5,
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

  it("can't submit dca parameters without fok parameters", async () => {
    await expect(
      broker.requestSwapDepositAddress(
        {
          srcAsset: Assets.FLIP,
          destAsset: Assets.USDC,
          srcChain: 'Ethereum',
          destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
          destChain: 'Ethereum',
          maxBoostFeeBps: 100,
          dcaParams: {
            numberOfChunks: 100,
            chunkIntervalBlocks: 5,
          },
        },
        brokerConfig,
        'perseverance',
      ),
    ).rejects.toThrow('dcaParams requires fillOrKillParams');
  });

  it.each([
    '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
    '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
  ])('works with polkadot dest addresses', async (destAddress) => {
    const postSpy = mockResponse();
    await broker.requestSwapDepositAddress(
      {
        srcAsset: Assets.ETH,
        srcChain: 'Ethereum',
        destAsset: Assets.DOT,
        destChain: 'Polkadot',
        destAddress,
      },
      brokerConfig,
      'perseverance',
    );
    expect(postSpy.mock.calls[0][1].params[2]).toEqual(
      '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
    );
  });

  it.each([
    '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
    '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
  ])('works with polkadot refund addresses', async (refundAddress) => {
    const postSpy = mockResponse();
    await broker.requestSwapDepositAddress(
      {
        srcAsset: Assets.DOT,
        srcChain: 'Polkadot',
        destAsset: Assets.ETH,
        destChain: 'Ethereum',
        destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress,
          minPriceX128: '10000000000000',
        },
      },
      brokerConfig,
      'perseverance',
    );
    expect(postSpy.mock.calls[0][1].params[7].refund_address).toEqual(
      '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
    );
  });
});
