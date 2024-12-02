import * as base58 from '@chainflip/utils/base58';
import { bytesToHex } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import * as broker from '../broker';
import { Assets, chainConstants } from '../enums';
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
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toStrictEqual({
      id: requestObject.id,
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
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toStrictEqual({
      id: requestObject.id,
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
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toStrictEqual({
      id: requestObject.id,
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
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toStrictEqual({
      id: requestObject.id,
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
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toStrictEqual({
      id: requestObject.id,
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
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toStrictEqual({
      id: requestObject.id,
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
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toStrictEqual({
      id: requestObject.id,
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
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toStrictEqual({
      id: requestObject.id,
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
    expect(postSpy.mock.calls[0][1][0].params[2]).toEqual(
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
    expect(postSpy.mock.calls[0][1][0].params[7].refund_address).toEqual(
      '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
    );
  });
});

describe(broker.buildExtrinsicPayload, () => {
  const evmAddress = '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF';
  const dotAddress = '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo';
  const solAddress = '3yKDHJgzS2GbZB9qruoadRYtq8597HZifnRju7fHpdRC';
  const btcAddress = 'bcrt1p785mga8djc3r5f7afaechlth4laxaty2rt08ncgydw4j7zv8np5suf7etv';

  const basicSwaps = [
    [
      'to Ethereum',
      {
        destAsset: 'FLIP',
        destChain: 'Ethereum',
        destAddress: evmAddress,
      },
    ],
    [
      'to Arbitrum',
      {
        destAsset: 'ETH',
        destChain: 'Arbitrum',
        destAddress: evmAddress,
      },
    ],
    [
      'to Solana',
      {
        destAsset: 'USDC',
        destChain: 'Solana',
        destAddress: solAddress,
      },
    ],
    [
      'to Polkadot (ss58)',
      {
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: dotAddress,
      },
    ],
    [
      'to Polkadot (hex)',
      {
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: ss58.toPublicKey(dotAddress),
      },
    ],
    [
      'to Bitcoin',
      {
        destAsset: 'BTC',
        destChain: 'Bitcoin',
        destAddress: btcAddress,
      },
    ],
  ] as [string, Omit<broker.NewSwapRequest, 'srcAsset' | 'srcChain'>][];

  it.each(basicSwaps)('builds basic swap params %s', (label, params) => {
    expect(
      broker.buildExtrinsicPayload({
        srcAsset: 'SOL',
        srcChain: 'Solana',
        ...params,
        commissionBps: null,
        ccmParams: null,
        maxBoostFeeBps: null,
        affiliates: null,
        fillOrKillParams: null,
        dcaParams: null,
      }),
    ).toMatchSnapshot(label);
  });

  it('adds the broker commission', () => {
    expect(
      broker.buildExtrinsicPayload({
        ccmParams: null,
        maxBoostFeeBps: null,
        affiliates: null,
        fillOrKillParams: null,
        dcaParams: null,
        srcAsset: 'SOL',
        srcChain: 'Solana',
        ...basicSwaps[0][1],
        commissionBps: 100,
      }),
    ).toMatchSnapshot();
  });

  it('adds ccm params', () => {
    const params = {
      commissionBps: null,
      maxBoostFeeBps: null,
      affiliates: null,
      fillOrKillParams: null,
      dcaParams: null,
      srcAsset: 'SOL',
      srcChain: 'Solana',
      ...basicSwaps[0][1],
      ccmParams: {
        message: '0xdeadbeef',
        gasBudget: '123456789',
      },
    } satisfies broker.ExtrinsicPayloadParams;

    expect(broker.buildExtrinsicPayload(params)).toMatchSnapshot('dummy cf params');
    expect(
      broker.buildExtrinsicPayload({
        ...params,
        ccmParams: { ...params.ccmParams, cfParameters: '0x1234' },
      }),
    ).toMatchSnapshot('with cf params');
  });

  it('adds max boost fee', () => {
    const params = {
      commissionBps: null,
      ccmParams: null,
      affiliates: null,
      fillOrKillParams: null,
      dcaParams: null,
      srcAsset: 'BTC',
      srcChain: 'Bitcoin',
      ...basicSwaps[0][1],
      maxBoostFeeBps: 30,
    } satisfies broker.ExtrinsicPayloadParams;

    expect(broker.buildExtrinsicPayload(params)).toMatchSnapshot();
  });

  it('adds affiliates', () => {
    const params = {
      commissionBps: null,
      ccmParams: null,
      maxBoostFeeBps: null,
      fillOrKillParams: null,
      dcaParams: null,
      srcAsset: 'SOL',
      srcChain: 'Solana',
      ...basicSwaps[0][1],
      affiliates: [
        {
          account: 'cFLdocJo3bjT7JbT7R46cA89QfvoitrKr9P3TsMcdkVWeeVLa',
          commissionBps: 10,
        },
      ],
    } satisfies broker.ExtrinsicPayloadParams;

    expect(broker.buildExtrinsicPayload(params)).toMatchSnapshot();
  });

  it.each([
    ['Bitcoin', 'P2PKH', '1PYVSoeftFP4EVBN3ou8vZctkhDthJamvp'],
    ['Bitcoin', 'P2SH', '32k55FA93MYqbjhLk9hokD3P666Vz9QqKb'],
    ['Bitcoin', 'P2WSH', 'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej'],
    ['Bitcoin', 'P2WSH', 'bc1qeklep85ntjz4605drds6aww9u0qr46qzrv5xswd35uhjuj8ahfcqgf6hak'],
    ['Bitcoin', 'Taproot', 'bc1pcwtqa8tjnq7ry5nmf0a9udzn6nfaqzmxdjj6ee779q2h6c58nyxss5hkga'],
    ['Solana', 'base58', solAddress],
    ['Solana', 'hex', bytesToHex(base58.decode(solAddress))],
    ['Polkadot', 'ss58', dotAddress],
    ['Polkadot', 'hex', ss58.toPublicKey(dotAddress)],
    ['Ethereum', '', evmAddress],
    ['Arbitrum', '', evmAddress],
  ] as const)('adds refund parameters (%s %s)', (chain, addressType, refundAddress) => {
    const params = {
      commissionBps: null,
      ccmParams: null,
      maxBoostFeeBps: null,
      affiliates: null,
      dcaParams: null,
      srcAsset: chainConstants[chain].assets[0],
      srcChain: chain,
      ...basicSwaps[0][1],
      fillOrKillParams: {
        refundAddress,
        retryDurationBlocks: 100,
        minPriceX128: '10000000000000',
      },
    } satisfies broker.ExtrinsicPayloadParams;

    expect(broker.buildExtrinsicPayload(params)).toMatchSnapshot();
  });

  it('requires FoK for DCA', () => {
    const params = {
      commissionBps: null,
      ccmParams: null,
      maxBoostFeeBps: null,
      affiliates: null,
      fillOrKillParams: null,
      srcAsset: 'SOL',
      srcChain: 'Solana',
      ...basicSwaps[0][1],
      dcaParams: {
        numberOfChunks: 100,
        chunkIntervalBlocks: 5,
      },
    } satisfies broker.ExtrinsicPayloadParams;

    expect(() => broker.buildExtrinsicPayload(params)).toThrow();
  });

  it('adds DCA params', () => {
    const params = {
      commissionBps: null,
      ccmParams: null,
      maxBoostFeeBps: null,
      affiliates: null,
      srcAsset: 'SOL',
      srcChain: 'Solana',
      ...basicSwaps[0][1],
      fillOrKillParams: {
        refundAddress: solAddress,
        retryDurationBlocks: 100,
        minPriceX128: '10000000000000',
      },
      dcaParams: {
        numberOfChunks: 100,
        chunkIntervalBlocks: 5,
      },
    } satisfies broker.ExtrinsicPayloadParams;

    expect(broker.buildExtrinsicPayload(params)).toMatchSnapshot();
  });
});
