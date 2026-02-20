import { describe, it, expect } from 'vitest';
import * as broker from '../broker.js';
import { mockRpcResponse } from '../tests/fixtures.js';

describe(broker.requestSwapDepositAddress, () => {
  const brokerConfig = { url: 'https://example.com' };

  const MOCKED_ETH_RESPONSE = {
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

  const mockResponse = (data: Record<string, any> = MOCKED_ETH_RESPONSE) =>
    mockRpcResponse({ data });

  it('gets a response from the broker', async () => {
    const postSpy = mockResponse();
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'USDC', chain: 'Ethereum' },
        destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '10000000000000',
          maxOraclePriceSlippage: 50,
        },
      },
      brokerConfig,
      'perseverance',
    );
    expect(postSpy.mock.calls[0][0]).toBe(brokerConfig.url);
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toStrictEqual({
      id: requestObject.id,
      jsonrpc: '2.0',
      method: 'broker_request_swap_deposit_address',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        0,
        null,
        null,
        null,
        {
          retry_duration: 500,
          refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refund_ccm_metadata: null,
          min_price: '0x9184e72a000',
          max_oracle_price_slippage: 50,
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

  it('gets a response from the broker for bitcoin mainnet', async () => {
    const postSpy = mockResponse();
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '10000000000000',
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
      method: 'broker_request_swap_deposit_address',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'BTC', chain: 'Bitcoin' },
        '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        0,
        null,
        null,
        null,
        {
          retry_duration: 500,
          refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refund_ccm_metadata: null,
          min_price: '0x9184e72a000',
          max_oracle_price_slippage: null,
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

  it('rejects testnet addresses for bitcoin mainnet', async () => {
    await expect(
      broker.requestSwapDepositAddress(
        {
          srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
          destAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAddress: '2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
            minPriceX128: '10000000000000',
            maxOraclePriceSlippage: 50,
          },
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
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'USDC', chain: 'Ethereum' },
        destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '10000000000000',
          maxOraclePriceSlippage: 50,
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
      method: 'broker_request_swap_deposit_address',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        0,
        {
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
          ccm_additional_data: '0x',
        },
        null,
        null,
        {
          retry_duration: 500,
          refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refund_ccm_metadata: null,
          min_price: '0x9184e72a000',
          max_oracle_price_slippage: 50,
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

  it('submits boost fee', async () => {
    const postSpy = mockResponse();
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'USDC', chain: 'Ethereum' },
        destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '10000000000000',
          maxOraclePriceSlippage: 50,
        },
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
      method: 'broker_request_swap_deposit_address',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        0,
        {
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
          ccm_additional_data: '0x',
        },
        100,
        null,
        {
          retry_duration: 500,
          refund_ccm_metadata: null,
          refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          min_price: '0x9184e72a000',
          max_oracle_price_slippage: 50,
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

  it('submits broker commission', async () => {
    const postSpy = mockResponse();
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'USDC', chain: 'Ethereum' },
        destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '10000000000000',
          maxOraclePriceSlippage: 50,
        },
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
      method: 'broker_request_swap_deposit_address',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        25,
        {
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
          ccm_additional_data: '0x',
        },
        100,
        null,
        {
          retry_duration: 500,
          refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refund_ccm_metadata: null,
          min_price: '0x9184e72a000',
          max_oracle_price_slippage: 50,
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

  it('submits affiliate brokers', async () => {
    const postSpy = mockResponse();
    const result = await broker.requestSwapDepositAddress(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'USDC', chain: 'Ethereum' },
        destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '10000000000000',
          maxOraclePriceSlippage: 50,
        },
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
      method: 'broker_request_swap_deposit_address',
      params: [
        { asset: 'FLIP', chain: 'Ethereum' },
        { asset: 'USDC', chain: 'Ethereum' },
        '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        30,
        {
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
          ccm_additional_data: '0x',
        },
        100,
        [
          { account: 'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n', bps: 10 },
          { account: 'cFJ4sqrg4FnrLPsGdt5w85XExGYxVLHLYLci28PnqcVVb8r8a', bps: 20 },
        ],
        {
          retry_duration: 500,
          refund_address: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          refund_ccm_metadata: null,
          min_price: '0x9184e72a000',
          max_oracle_price_slippage: 50,
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
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'USDC', chain: 'Ethereum' },
        destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
        maxBoostFeeBps: 100,
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          minPriceX128: '10000000000000',
          maxOraclePriceSlippage: 50,
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
      method: 'broker_request_swap_deposit_address',
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
          refund_ccm_metadata: null,
          retry_duration: 500,
          max_oracle_price_slippage: 50,
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

  it.each([
    '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
    '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
  ])('does not work with polkadot dest addresses', async (destAddress) => {
    await expect(
      broker.requestSwapDepositAddress(
        {
          srcAsset: { asset: 'ETH', chain: 'Ethereum' },
          destAsset: { asset: 'DOT', chain: 'Assethub' },
          destAddress,
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
            minPriceX128: '10000000000000',
            maxOraclePriceSlippage: 50,
          },
        },
        brokerConfig,
        'perseverance',
      ),
    ).rejects.toThrow();
  });

  it.each([
    '1yMmfLti1k3huRQM2c47WugwonQMqTvQ2GUFxnU7Pcs7xPo',
    '0x2afba9278e30ccf6a6ceb3a8b6e336b70068f045c666f2e7f4f9cc5f47db8972',
  ])('does not work with polkadot refund addresses', async (refundAddress) => {
    await expect(
      broker.requestSwapDepositAddress(
        {
          srcAsset: { asset: 'DOT', chain: 'Assethub' },
          destAsset: { asset: 'ETH', chain: 'Ethereum' },
          destAddress: '0xb853Fd0303aAc70196E36758dB4754147BC73b32',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress,
            minPriceX128: '10000000000000',
            maxOraclePriceSlippage: 50,
          },
        },
        brokerConfig,
        'perseverance',
      ),
    ).rejects.toThrow();
  });
});

describe(broker.requestSwapParameterEncoding, () => {
  const brokerConfig = { url: 'https://example.com' };

  const MOCKED_ETH_NATIVE_RESPONSE = {
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

  const MOCKED_ETH_TOKEN_RESPONSE = {
    id: '1',
    jsonrpc: '2.0',
    result: {
      chain: 'Ethereum',
      calldata:
        '0xdd68734500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000014b5fb203bd12f528813b512408b374a8f0f44367a000000000000000000000000000000000000000000000000000000000000000000000000000000000000005f0000000000004cd85eb477b4820bbf10dc4689d8b344c2722eac000000000000000000000000000000000000000000000000000000000000000000009059e6d854b769a505d01148af212bf8cb7f8469a7153edce8dcaedd9d29912501000000',
      value: '0x4563918244f40000',
      to: '0xb7a5bd0345ef1cc5e66bf61bdec17d2461fbd968',
      source_token_address: '0x10c6e9530f1c1af873a391030a1d9e8ed0630d26',
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
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          minPriceX128: '34028236692093846346337460743176821145600000000000000000000000',
          maxOraclePriceSlippage: 50,
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
          max_oracle_price_slippage: 50,
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
    const postSpy = mockResponse(MOCKED_ETH_NATIVE_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: 'ETH', chain: 'Ethereum' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
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
            refund_ccm_metadata: null,
            retry_duration: 500,
            max_oracle_price_slippage: 50,
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
        srcAsset: { asset: 'SOL', chain: 'Solana' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        amount: '12500000',
        srcAddress: 'oQPnhXAbLbMuKHESaGrbXT17CyvWCpLyERSJA9HCYd7',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: 'oQPnhXAbLbMuKHESaGrbXT17CyvWCpLyERSJA9HCYd7',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
        },
        extraParams: { seed: '0x511353fe6f12ae8193a1c6a48b34cb8f5c642ce77747b8612cbd85674b1b8fdc' },
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
          seed: '0x511353fe6f12ae8193a1c6a48b34cb8f5c642ce77747b8612cbd85674b1b8fdc',
          from: 'oQPnhXAbLbMuKHESaGrbXT17CyvWCpLyERSJA9HCYd7',
          input_amount: '0xbebc20',
          refund_parameters: {
            min_price: '0x989680',
            refund_address: 'oQPnhXAbLbMuKHESaGrbXT17CyvWCpLyERSJA9HCYd7',
            refund_ccm_metadata: null,
            retry_duration: 500,
            max_oracle_price_slippage: 50,
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
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          amount: '12500000',
          destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: '2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm',
            minPriceX128: '10000000',
            maxOraclePriceSlippage: 50,
          },
        },
        brokerConfig,
        'mainnet',
      ),
    ).rejects.toThrow(/2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm/);
  });

  it('rejects testnet source addresses for swap from bitcoin', async () => {
    mockResponse(MOCKED_BTC_RESPONSE);
    await expect(
      broker.requestSwapParameterEncoding(
        {
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          amount: '12500000',
          destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
          srcAddress: '2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
            minPriceX128: '10000000',
            maxOraclePriceSlippage: 50,
          },
        },
        brokerConfig,
        'mainnet',
      ),
    ).rejects.toThrow(/2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm/);
  });

  it('rejects testnet destination addresses for swap to bitcoin', async () => {
    mockResponse(MOCKED_BTC_RESPONSE);
    await expect(
      broker.requestSwapParameterEncoding(
        {
          srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
          destAsset: { asset: 'BTC', chain: 'Bitcoin' },
          amount: '12500000',
          destAddress: '2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm',
          srcAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
            minPriceX128: '10000000',
            maxOraclePriceSlippage: 50,
          },
        },
        brokerConfig,
        'mainnet',
      ),
    ).rejects.toThrow(/2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm/);
  });

  it('submits ccm data', async () => {
    const postSpy = mockResponse(MOCKED_ETH_NATIVE_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
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
            refund_ccm_metadata: null,
            retry_duration: 500,
            max_oracle_price_slippage: 50,
          },
        },
        {
          gas_budget: '0x75bcd15',
          message: '0xdeadc0de',
          ccm_additional_data: '0x',
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
    const postSpy = mockResponse(MOCKED_ETH_NATIVE_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
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
            refund_ccm_metadata: null,
            retry_duration: 500,
            max_oracle_price_slippage: 50,
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
    const postSpy = mockResponse(MOCKED_ETH_NATIVE_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
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
            refund_ccm_metadata: null,
            retry_duration: 500,
            max_oracle_price_slippage: 50,
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
    const postSpy = mockResponse(MOCKED_ETH_TOKEN_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
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
            refund_ccm_metadata: null,
            retry_duration: 500,
            max_oracle_price_slippage: 50,
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
      sourceTokenAddress: '0x10c6e9530f1c1af873a391030a1d9e8ed0630d26',
    });
  });

  it('submits dca parameters', async () => {
    const postSpy = mockResponse(MOCKED_ETH_TOKEN_RESPONSE);
    const result = await broker.requestSwapParameterEncoding(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
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
            refund_ccm_metadata: null,
            retry_duration: 500,
            max_oracle_price_slippage: 50,
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
      sourceTokenAddress: '0x10c6e9530f1c1af873a391030a1d9e8ed0630d26',
    });
  });
});

describe(broker.requestCfParametersEncoding, () => {
  const brokerConfig = { url: 'https://example.com' };

  const mockResponse = (result: `0x${string}`) =>
    mockRpcResponse({ data: { result, id: '1', jsonrpc: '2.0' } });

  it('gets a response for swap from bitcoin', async () => {
    const postSpy = mockResponse('0x1234');
    const result = await broker.requestCfParametersEncoding(
      {
        srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          minPriceX128: '34028236692093846346337460743176821145600000000000000000000000',
          maxOraclePriceSlippage: 50,
        },
      },
      brokerConfig,
      'mainnet',
    );
    expect(postSpy.mock.calls[0][0]).toBe(brokerConfig.url);
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toMatchInlineSnapshot(
      { id: expect.any(String) },
      `
      {
        "id": Any<String>,
        "jsonrpc": "2.0",
        "method": "broker_encode_cf_parameters",
        "params": [
          {
            "asset": "BTC",
            "chain": "Bitcoin",
          },
          {
            "asset": "FLIP",
            "chain": "Ethereum",
          },
          "0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C",
          0,
          {
            "max_oracle_price_slippage": 50,
            "min_price": "0x152d02c7e14af680000000000000000000000000000000000000",
            "refund_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "refund_ccm_metadata": null,
            "retry_duration": 500,
          },
          null,
          null,
          null,
          null,
        ],
      }
    `,
    );
    expect(result).toStrictEqual('0x1234');
  });

  it('gets a response for swap from ethereum', async () => {
    const postSpy = mockResponse('0x5678');
    const result = await broker.requestCfParametersEncoding(
      {
        srcAsset: { asset: 'ETH', chain: 'Ethereum' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
        },
      },
      brokerConfig,
      'mainnet',
    );
    expect(postSpy.mock.calls[0][0]).toBe(brokerConfig.url);
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toMatchInlineSnapshot(
      {
        id: expect.any(String),
      },
      `
      {
        "id": Any<String>,
        "jsonrpc": "2.0",
        "method": "broker_encode_cf_parameters",
        "params": [
          {
            "asset": "ETH",
            "chain": "Ethereum",
          },
          {
            "asset": "FLIP",
            "chain": "Ethereum",
          },
          "0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C",
          0,
          {
            "max_oracle_price_slippage": 50,
            "min_price": "0x989680",
            "refund_address": "0xe983fD1798689eee00c0Fb77e79B8f372DF41060",
            "refund_ccm_metadata": null,
            "retry_duration": 500,
          },
          null,
          null,
          null,
          null,
        ],
      }
    `,
    );
    expect(result).toStrictEqual('0x5678');
  });

  it('gets a response for swap from solana', async () => {
    const postSpy = mockResponse('0x9012');
    const result = await broker.requestCfParametersEncoding(
      {
        srcAsset: { asset: 'SOL', chain: 'Solana' },
        destAsset: { asset: 'FLIP', chain: 'Ethereum' },
        amount: '12500000',
        srcAddress: 'oQPnhXAbLbMuKHESaGrbXT17CyvWCpLyERSJA9HCYd7',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: 'oQPnhXAbLbMuKHESaGrbXT17CyvWCpLyERSJA9HCYd7',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
        },
      },
      brokerConfig,
      'mainnet',
    );
    expect(postSpy.mock.calls[0][0]).toBe(brokerConfig.url);
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toMatchInlineSnapshot(
      {
        id: expect.any(String),
      },
      `
      {
        "id": Any<String>,
        "jsonrpc": "2.0",
        "method": "broker_encode_cf_parameters",
        "params": [
          {
            "asset": "SOL",
            "chain": "Solana",
          },
          {
            "asset": "FLIP",
            "chain": "Ethereum",
          },
          "0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C",
          0,
          {
            "max_oracle_price_slippage": 50,
            "min_price": "0x989680",
            "refund_address": "oQPnhXAbLbMuKHESaGrbXT17CyvWCpLyERSJA9HCYd7",
            "refund_ccm_metadata": null,
            "retry_duration": 500,
          },
          null,
          null,
          null,
          null,
        ],
      }
    `,
    );
    expect(result).toStrictEqual('0x9012');
  });

  it('rejects testnet refund addresses for swap from bitcoin', async () => {
    await expect(
      broker.requestCfParametersEncoding(
        {
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          amount: '12500000',
          destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: '2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm',
            minPriceX128: '10000000',
            maxOraclePriceSlippage: 50,
          },
        },
        brokerConfig,
        'mainnet',
      ),
    ).rejects.toThrow(/2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm/);
  });

  it('rejects testnet source addresses for swap from bitcoin', async () => {
    await expect(
      broker.requestCfParametersEncoding(
        {
          srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
          destAsset: { asset: 'FLIP', chain: 'Ethereum' },
          amount: '12500000',
          destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
          srcAddress: '2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
            minPriceX128: '10000000',
            maxOraclePriceSlippage: 50,
          },
        },
        brokerConfig,
        'mainnet',
      ),
    ).rejects.toThrow(/2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm/);
  });

  it('rejects testnet destination addresses for swap to bitcoin', async () => {
    await expect(
      broker.requestCfParametersEncoding(
        {
          srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
          destAsset: { asset: 'BTC', chain: 'Bitcoin' },
          amount: '12500000',
          destAddress: '2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm',
          srcAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
          fillOrKillParams: {
            retryDurationBlocks: 500,
            refundAddress: '0xe983fD1798689eee00c0Fb77e79B8f372DF41060',
            minPriceX128: '10000000',
            maxOraclePriceSlippage: 50,
          },
        },
        brokerConfig,
        'mainnet',
      ),
    ).rejects.toThrow(/2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm/);
  });

  it('submits ccm data', async () => {
    const postSpy = mockResponse('0x1234');
    const result = await broker.requestCfParametersEncoding(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
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
    expect(requestObject).toMatchInlineSnapshot(
      {
        id: expect.any(String),
      },
      `
      {
        "id": Any<String>,
        "jsonrpc": "2.0",
        "method": "broker_encode_cf_parameters",
        "params": [
          {
            "asset": "FLIP",
            "chain": "Ethereum",
          },
          {
            "asset": "ETH",
            "chain": "Ethereum",
          },
          "0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C",
          0,
          {
            "max_oracle_price_slippage": 50,
            "min_price": "0x989680",
            "refund_address": "0xEA30083b1DE9494d811FF45f5B95b884e1cAD873",
            "refund_ccm_metadata": null,
            "retry_duration": 500,
          },
          {
            "ccm_additional_data": "0x",
            "gas_budget": "0x75bcd15",
            "message": "0xdeadc0de",
          },
          null,
          null,
          null,
        ],
      }
    `,
    );
    expect(result).toStrictEqual('0x1234');
  });

  it('submits boost fee', async () => {
    const postSpy = mockResponse('0x5678');
    const result = await broker.requestCfParametersEncoding(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
        },
        maxBoostFeeBps: 100,
      },
      brokerConfig,
      'perseverance',
    );
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toMatchInlineSnapshot(
      {
        id: expect.any(String),
      },
      `
      {
        "id": Any<String>,
        "jsonrpc": "2.0",
        "method": "broker_encode_cf_parameters",
        "params": [
          {
            "asset": "FLIP",
            "chain": "Ethereum",
          },
          {
            "asset": "ETH",
            "chain": "Ethereum",
          },
          "0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C",
          0,
          {
            "max_oracle_price_slippage": 50,
            "min_price": "0x989680",
            "refund_address": "0xEA30083b1DE9494d811FF45f5B95b884e1cAD873",
            "refund_ccm_metadata": null,
            "retry_duration": 500,
          },
          null,
          100,
          null,
          null,
        ],
      }
    `,
    );
    expect(result).toStrictEqual('0x5678');
  });

  it('submits broker commission', async () => {
    const postSpy = mockResponse('0x1234');
    const result = await broker.requestCfParametersEncoding(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
        },
        maxBoostFeeBps: 100,
        commissionBps: 25,
      },
      brokerConfig,
      'perseverance',
    );
    const requestObject = postSpy.mock.calls[0][1][0];
    expect(requestObject).toMatchInlineSnapshot(
      {
        id: expect.any(String),
      },
      `
      {
        "id": Any<String>,
        "jsonrpc": "2.0",
        "method": "broker_encode_cf_parameters",
        "params": [
          {
            "asset": "FLIP",
            "chain": "Ethereum",
          },
          {
            "asset": "ETH",
            "chain": "Ethereum",
          },
          "0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C",
          25,
          {
            "max_oracle_price_slippage": 50,
            "min_price": "0x989680",
            "refund_address": "0xEA30083b1DE9494d811FF45f5B95b884e1cAD873",
            "refund_ccm_metadata": null,
            "retry_duration": 500,
          },
          null,
          100,
          null,
          null,
        ],
      }
    `,
    );
    expect(result).toStrictEqual('0x1234');
  });

  it('submits affiliate brokers', async () => {
    const postSpy = mockResponse('0x1234');
    const result = await broker.requestCfParametersEncoding(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
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
    expect(requestObject).toMatchInlineSnapshot(
      { id: expect.any(String) },
      `
      {
        "id": Any<String>,
        "jsonrpc": "2.0",
        "method": "broker_encode_cf_parameters",
        "params": [
          {
            "asset": "FLIP",
            "chain": "Ethereum",
          },
          {
            "asset": "ETH",
            "chain": "Ethereum",
          },
          "0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C",
          30,
          {
            "max_oracle_price_slippage": 50,
            "min_price": "0x989680",
            "refund_address": "0xEA30083b1DE9494d811FF45f5B95b884e1cAD873",
            "refund_ccm_metadata": null,
            "retry_duration": 500,
          },
          null,
          100,
          [
            {
              "account": "cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n",
              "bps": 10,
            },
            {
              "account": "cFJ4sqrg4FnrLPsGdt5w85XExGYxVLHLYLci28PnqcVVb8r8a",
              "bps": 20,
            },
          ],
          null,
        ],
      }
    `,
    );
    expect(result).toStrictEqual('0x1234');
  });

  it('submits dca parameters', async () => {
    const postSpy = mockResponse('0x1234');
    const result = await broker.requestCfParametersEncoding(
      {
        srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
        destAsset: { asset: 'ETH', chain: 'Ethereum' },
        amount: '12500000',
        destAddress: '0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C',
        fillOrKillParams: {
          retryDurationBlocks: 500,
          refundAddress: '0xEA30083b1DE9494d811FF45f5B95b884e1cAD873',
          minPriceX128: '10000000',
          maxOraclePriceSlippage: 50,
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
    expect(requestObject).toMatchInlineSnapshot(
      {
        id: expect.any(String),
      },
      `
      {
        "id": Any<String>,
        "jsonrpc": "2.0",
        "method": "broker_encode_cf_parameters",
        "params": [
          {
            "asset": "FLIP",
            "chain": "Ethereum",
          },
          {
            "asset": "ETH",
            "chain": "Ethereum",
          },
          "0xf64EE838D880191706aBb0B7b6fCE008c2db6D8C",
          0,
          {
            "max_oracle_price_slippage": 50,
            "min_price": "0x989680",
            "refund_address": "0xEA30083b1DE9494d811FF45f5B95b884e1cAD873",
            "refund_ccm_metadata": null,
            "retry_duration": 500,
          },
          null,
          100,
          null,
          {
            "chunk_interval": 5,
            "number_of_chunks": 100,
          },
        ],
      }
    `,
    );
    expect(result).toStrictEqual('0x1234');
  });
});
