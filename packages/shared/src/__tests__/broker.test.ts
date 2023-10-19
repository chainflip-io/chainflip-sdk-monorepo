/* eslint-disable func-names */
import { Assets } from '../../enums';
import * as broker from '../broker';

describe(broker.requestSwapDepositAddress, () => {
  const fetchSpy = jest
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(Error('unhandled mock'));

  const mockResponse = (response: any) =>
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      body: (async function* () {
        for (const byte of new TextEncoder().encode(JSON.stringify(response))) {
          yield Uint8Array.from([byte]);
        }
      })(),
    } as any);

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
    const result = await broker.requestSwapDepositAddress({
      srcAsset: Assets.FLIP,
      destAsset: Assets.USDC,
      srcChain: 'Ethereum',
      destAddress: '0xcafebabe',
      destChain: 'Ethereum',
    });
    const requestObject = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
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
    const result = await broker.requestSwapDepositAddress({
      srcAsset: Assets.FLIP,
      destAsset: Assets.USDC,
      srcChain: 'Ethereum',
      destAddress: '0xcafebabe',
      destChain: 'Ethereum',
      ccmMetadata: {
        gasBudget: '123456789',
        message: '0xdeadc0de',
      },
    });
    const requestObject = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
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

  it('uses a provided broker', async () => {
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
      {
        url: 'https://example.com',
        commissionBps: 100,
      },
    );
    expect(fetchSpy.mock.calls[0][0]).toBe('https://example.com');
    const requestObject = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(requestObject).toStrictEqual({
      id: 1,
      jsonrpc: '2.0',
      method: 'broker_requestSwapDepositAddress',
      params: ['Flip', 'Usdc', '0xcafebabe', 100],
    });
    expect(result).toStrictEqual({
      address: '0x1234567890',
      issuedBlock: 50,
      channelId: 200n,
      sourceChainExpiryBlock: 1_000_000n,
    });
  });

  it('rejects oversize responses (1kb)', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      body: (async function* () {
        for (let i = 0; i < 1025; i += 1) {
          yield Uint8Array.from([97]);
        }
      })(),
    } as any);

    await expect(
      broker.requestSwapDepositAddress(
        {
          srcAsset: Assets.FLIP,
          destAsset: Assets.USDC,
          srcChain: 'Ethereum',
          destAddress: '0xcafebabe',
          destChain: 'Ethereum',
        },
        {
          url: 'https://example.com',
          commissionBps: 100,
        },
      ),
    ).rejects.toThrowError('response too large');
  });
});
