import { describe, it, expect } from 'vitest';
import * as broker from '../broker';
import { Assets, Chains } from '../enums';
import { mockRpcResponse } from '../tests/fixtures';

describe(broker.requestSwapDepositAddress, () => {
  const brokerConfig = { url: 'https://example.com' };

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
      channelId: 200,
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
      channelId: 200,
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
      channelId: 200,
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
      channelId: 200,
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
      channelId: 200,
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
      channelId: 200,
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
      channelId: 200,
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
      channelId: 200,
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
    expect(postSpy.mock.calls[0][1][0].params[2]).toEqual(destAddress);
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
    expect(postSpy.mock.calls[0][1][0].params[7].refund_address).toEqual(refundAddress);
  });
});

describe(broker.requestSwapParameterEncoding, () => {
  const brokerConfig = { url: 'https://example.com' };

  const MOCKED_ETH_RESPONSE = {
    id: '1',
    jsonrpc: '2.0',
    result: {
      chain: 'Ethereum',
      calldata:
        '0xdd68734500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000014b5fb203bd12f528813b512408b374a8f0f44367a000000000000000000000000000000000000000000000000000000000000000000000000000000000000005f0000000000004cd85eb477b4820bbf10dc4689d8b344c2722eac000000000000000000000000000000000000000000000000000000000000000000009059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d29912501000000',
      value: '0x4563918244f40000',
      to: '0xb7a5bd0345ef1cc5e66bf61bdec17d2461fbd968',
    },
  };

  const MOCKED_BTC_RESPONSE = {
    id: '1',
    jsonrpc: '2.0',
    result: {
      chain: 'Bitcoin',
      nulldata_payload:
        '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
      deposit_address: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
    },
  };

  const MOCKED_SOL_RESPONSE = {
    id: '1',
    jsonrpc: '2.0',
    result: {
      chain: 'Solana',
      program_id: '35uYgHdfZQT4kHkaaXQ6ZdCkK5LFrsk43btTLbGCRCNT',
      accounts: [
        {
          pubkey: 'Gm4QT3aC9YZtyZAFjMNTVEMB4otEY1JW2dVEBFbGfr9p',
          is_signer: true,
          is_writable: true,
        },
        {
          pubkey: '2tmtGLQcBd11BMiE9B1tAkQXwmPNgR79Meki2Eme4Ec9',
          is_signer: false,
          is_writable: true,
        },
        {
          pubkey: '11111111111111111111111111111111',
          is_signer: false,
          is_writable: false,
        },
      ],
      data: '0xa3265ce2f3698dc400e876481700000001000000140000004d2c78895c0fb2dbc04ecb98345f7b5e30bbd5f203000000006b000000000000000004f79d5e026f12edc6443a534b2cdd5072233989b415d7596573e743f3e5b386fb000000000000000000000000000000000000000000000000000000000000000000009059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125010000',
    },
  };

  const mockResponse = (data: Record<string, any>) => mockRpcResponse({ data });

  it('gets a response for swap from bitcoin', async () => {
    const postSpy = mockResponse(MOCKED_BTC_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: Assets.BTC, chain: Chains.Bitcoin },
        destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          minPriceX128: '34028236692093846346337460743176821145600000000000000000000000',
        },
      },
      brokerConfig,
      'mainnet',
    );
    expect(postSpy.mock.calls[0][0]).toBe(brokerConfig.url);
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toStrictEqual({
      id: requestObject.id,
      jsonrpc: '2.0',
      method: 'broker_request_swap_parameter_encoding',
      params: [
        { asset: 'BTC', chain: 'Bitcoin' },
        { asset: 'FLIP', chain: 'Ethereum' },
        '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        0,
        {
          chain: 'Bitcoin',
          min_output_amount: '0xfc6f7c40458122964d0000000',
          retry_duration: 500,
        },
        null,
        null,
        null,
        null,
      ],
    });
    expect(result).toStrictEqual({
      chain: 'Bitcoin',
      nulldataPayload:
        '0x0003656623d865425c0a4955ef7e7a39d09f58554d0800000000000000000000000000000000000001000200000100',
      depositAddress: 'bcrt1pmrhjpvq2w7cgesrcrvuhqw6n6j487l6uc7tmwtx9jen7ezesunhqllvzxx',
    });
  });

  it('gets a response for swap from ethereum', async () => {
    const postSpy = mockResponse(MOCKED_ETH_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: Assets.ETH, chain: Chains.Ethereum },
        destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
          minPriceX128: '10000000',
        },
      },
      brokerConfig,
      'mainnet',
    );
    expect(postSpy.mock.calls[0][0]).toBe(brokerConfig.url);
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toStrictEqual({
      id: requestObject.id,
      jsonrpc: '2.0',
      method: 'broker_request_swap_parameter_encoding',
      params: [
        { asset: 'ETH', chain: 'Ethereum' },
        { asset: 'FLIP', chain: 'Ethereum' },
        '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        0,
        {
          chain: 'Ethereum',
          input_amount: '0xbebc20',
          refund_parameters: {
            min_price: '0x989680',
            refund_address: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
            retry_duration: 500,
          },
        },
        null,
        null,
        null,
        null,
      ],
    });
    expect(result).toStrictEqual({
      chain: 'Ethereum',
      calldata:
        '0xdd68734500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000014b5fb203bd12f528813b512408b374a8f0f44367a000000000000000000000000000000000000000000000000000000000000000000000000000000000000005f0000000000004cd85eb477b4820bbf10dc4689d8b344c2722eac000000000000000000000000000000000000000000000000000000000000000000009059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d29912501000000',
      value: 5000000000000000000n,
      to: '0xb7a5bd0345ef1cc5e66bf61bdec17d2461fbd968',
    });
  });

  it('gets a response for swap from solana', async () => {
    const postSpy = mockResponse(MOCKED_SOL_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: Assets.SOL, chain: Chains.Solana },
        destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
        amount: '12500000',
        srcAddress: 'oQPnhXAbLbMuKHESaGrbXT17CyvWCpLyERSJA9HCYd7',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: 'oQPnhXAbLbMuKHESaGrbXT17CyvWCpLyERSJA9HCYd7',
          minPriceX128: '10000000',
        },
        extraParams: { solanaDataAccount: 'updtkJ8HAhh3rSkBCd3p9Z1Q74yJW4rMhSbScRskDPM' },
      },
      brokerConfig,
      'mainnet',
    );
    expect(postSpy.mock.calls[0][0]).toBe(brokerConfig.url);
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toStrictEqual({
      id: requestObject.id,
      jsonrpc: '2.0',
      method: 'broker_request_swap_parameter_encoding',
      params: [
        { asset: 'SOL', chain: 'Solana' },
        { asset: 'FLIP', chain: 'Ethereum' },
        '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        0,
        {
          chain: 'Solana',
          event_data_account: 'updtkJ8HAhh3rSkBCd3p9Z1Q74yJW4rMhSbScRskDPM',
          from: 'oQPnhXAbLbMuKHESaGrbXT17CyvWCpLyERSJA9HCYd7',
          input_amount: '0xbebc20',
          refund_parameters: {
            min_price: '0x989680',
            refund_address: 'oQPnhXAbLbMuKHESaGrbXT17CyvWCpLyERSJA9HCYd7',
            retry_duration: 500,
          },
        },
        null,
        null,
        null,
        null,
      ],
    });
    expect(result).toStrictEqual({
      chain: 'Solana',
      programId: '35uYgHdfZQT4kHkaaXQ6ZdCkK5LFrsk43btTLbGCRCNT',
      accounts: [
        {
          pubkey: 'Gm4QT3aC9YZtyZAFjMNTVEMB4otEY1JW2dVEBFbGfr9p',
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: '2tmtGLQcBd11BMiE9B1tAkQXwmPNgR79Meki2Eme4Ec9',
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: '11111111111111111111111111111111',
          isSigner: false,
          isWritable: false,
        },
      ],
      data: '0xa3265ce2f3698dc400e876481700000001000000140000004d2c78895c0fb2dbc04ecb98345f7b5e30bbd5f203000000006b000000000000000004f79d5e026f12edc6443a534b2cdd5072233989b415d7596573e743f3e5b386fb000000000000000000000000000000000000000000000000000000000000000000009059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d299125010000',
    });
  });

  it('rejects testnet refund addresses for swap from bitcoin', async () => {
    mockResponse(MOCKED_BTC_RESPONSE);
    await expect(
      broker.requestSwapParameterEncoding(
        {
          srcAsset: { asset: Assets.BTC, chain: Chains.Bitcoin },
          destAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
          amount: '12500000',
          destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: '2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm',
            minPriceX128: '10000000',
          },
        },
        brokerConfig,
        'mainnet',
      ),
    ).rejects.toThrow();
  });

  it('submits ccm data', async () => {
    const postSpy = mockResponse(MOCKED_ETH_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
        destAsset: { asset: Assets.ETH, chain: Chains.Ethereum },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
        },
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
      method: 'broker_request_swap_parameter_encoding',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        0,
        {
          chain: 'Ethereum',
          input_amount: '0xbebc20',
          refund_parameters: {
            min_price: '0x989680',
            refund_address: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
            retry_duration: 500,
          },
        },
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
      chain: 'Ethereum',
      calldata:
        '0xdd68734500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000014b5fb203bd12f528813b512408b374a8f0f44367a000000000000000000000000000000000000000000000000000000000000000000000000000000000000005f0000000000004cd85eb477b4820bbf10dc4689d8b344c2722eac000000000000000000000000000000000000000000000000000000000000000000009059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d29912501000000',
      value: 5000000000000000000n,
      to: '0xb7a5bd0345ef1cc5e66bf61bdec17d2461fbd968',
    });
  });

  it('submits boost fee', async () => {
    const postSpy = mockResponse(MOCKED_ETH_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
        destAsset: { asset: Assets.ETH, chain: Chains.Ethereum },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
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
      method: 'broker_request_swap_parameter_encoding',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        0,
        {
          chain: 'Ethereum',
          input_amount: '0xbebc20',
          refund_parameters: {
            min_price: '0x989680',
            refund_address: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
            retry_duration: 500,
          },
        },
        null,
        100,
        null,
        null,
      ],
    });
    expect(result).toStrictEqual({
      chain: 'Ethereum',
      calldata:
        '0xdd68734500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000014b5fb203bd12f528813b512408b374a8f0f44367a000000000000000000000000000000000000000000000000000000000000000000000000000000000000005f0000000000004cd85eb477b4820bbf10dc4689d8b344c2722eac000000000000000000000000000000000000000000000000000000000000000000009059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d29912501000000',
      value: 5000000000000000000n,
      to: '0xb7a5bd0345ef1cc5e66bf61bdec17d2461fbd968',
    });
  });

  it('submits broker commission', async () => {
    const postSpy = mockResponse(MOCKED_ETH_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
        destAsset: { asset: Assets.ETH, chain: Chains.Ethereum },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
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
      method: 'broker_request_swap_parameter_encoding',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        25,
        {
          chain: 'Ethereum',
          input_amount: '0xbebc20',
          refund_parameters: {
            min_price: '0x989680',
            refund_address: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
            retry_duration: 500,
          },
        },
        null,
        100,
        null,
        null,
      ],
    });
    expect(result).toStrictEqual({
      chain: 'Ethereum',
      calldata:
        '0xdd68734500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000014b5fb203bd12f528813b512408b374a8f0f44367a000000000000000000000000000000000000000000000000000000000000000000000000000000000000005f0000000000004cd85eb477b4820bbf10dc4689d8b344c2722eac000000000000000000000000000000000000000000000000000000000000000000009059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d29912501000000',
      value: 5000000000000000000n,
      to: '0xb7a5bd0345ef1cc5e66bf61bdec17d2461fbd968',
    });
  });

  it('submits affiliate brokers', async () => {
    const postSpy = mockResponse(MOCKED_ETH_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
        destAsset: { asset: Assets.ETH, chain: Chains.Ethereum },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
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
      method: 'broker_request_swap_parameter_encoding',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        30,
        {
          chain: 'Ethereum',
          input_amount: '0xbebc20',
          refund_parameters: {
            min_price: '0x989680',
            refund_address: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
            retry_duration: 500,
          },
        },
        null,
        100,
        [
          {
            account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n',
            bps: 10,
          },
          {
            account: 'cFJ4sqrg4FnrLPsGdt5w85XExGYxVLHLYLci28PnqcVVb8r8a',
            bps: 20,
          },
        ],
        null,
      ],
    });
    expect(result).toStrictEqual({
      chain: 'Ethereum',
      calldata:
        '0xdd68734500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000014b5fb203bd12f528813b512408b374a8f0f44367a000000000000000000000000000000000000000000000000000000000000000000000000000000000000005f0000000000004cd85eb477b4820bbf10dc4689d8b344c2722eac000000000000000000000000000000000000000000000000000000000000000000009059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d29912501000000',
      value: 5000000000000000000n,
      to: '0xb7a5bd0345ef1cc5e66bf61bdec17d2461fbd968',
    });
  });

  it('submits dca parameters', async () => {
    const postSpy = mockResponse(MOCKED_ETH_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: Assets.FLIP, chain: Chains.Ethereum },
        destAsset: { asset: Assets.ETH, chain: Chains.Ethereum },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
        },
        maxBoostFeeBps: 100,
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
      method: 'broker_request_swap_parameter_encoding',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'ETH', chain: 'Ethereum' },
        '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        0,
        {
          chain: 'Ethereum',
          input_amount: '0xbebc20',
          refund_parameters: {
            min_price: '0x989680',
            refund_address: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
            retry_duration: 500,
          },
        },
        null,
        100,
        null,
        {
          number_of_chunks: 100,
          chunk_interval: 5,
        },
      ],
    });
    expect(result).toStrictEqual({
      chain: 'Ethereum',
      calldata:
        '0xdd68734500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000014b5fb203bd12f528813b512408b374a8f0f44367a000000000000000000000000000000000000000000000000000000000000000000000000000000000000005f0000000000004cd85eb477b4820bbf10dc4689d8b344c2722eac000000000000000000000000000000000000000000000000000000000000000000009059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d29912501000000',
      value: 5000000000000000000n,
      to: '0xb7a5bd0345ef1cc5e66bf61bdec17d2461fbd968',
    });
  });
});
