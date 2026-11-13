import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import {
  getParameterEncodingRequestSchema,
  getVaultSwapParameterEncodingRequestSchema,
} from '../../broker.js';
import type { ApiClient } from '../client.js';
import {
  ApiParsedBody,
  ApiRequestBody,
  ApiSuccessResponse,
  createApiContract,
  type ApiContract,
} from '../contract.js';
import { EncodedVaultSwapData } from '../encodeVaultSwapData.js';
import { NetworkInfo } from '../networkInfo.js';
import { getAccountCreationDepositChannelSchema } from '../openAccountCreationDepositChannel.js';
import { DepositChannelInfo, getOpenSwapDepositChannelSchema } from '../openSwapDepositChannel.js';

describe(createApiContract, () => {
  it('declares the routes', () => {
    const contract = createApiContract('mainnet');

    expect(
      Object.fromEntries(
        Object.entries(contract).map(([name, route]) => [
          name,
          {
            method: route.method,
            path: route.path,
            hasBody: 'body' in route,
            statuses: Object.keys(route.responses),
          },
        ]),
      ),
    ).toMatchInlineSnapshot(`
      {
        "encodeCfParameters": {
          "hasBody": true,
          "method": "POST",
          "path": "/api/encodeCfParameters",
          "statuses": [
            "200",
          ],
        },
        "encodeVaultSwapData": {
          "hasBody": true,
          "method": "POST",
          "path": "/api/encodeVaultSwapData",
          "statuses": [
            "200",
          ],
        },
        "networkInfo": {
          "hasBody": false,
          "method": "GET",
          "path": "/api/networkInfo",
          "statuses": [
            "200",
          ],
        },
        "openAccountCreationDepositChannel": {
          "hasBody": true,
          "method": "POST",
          "path": "/api/openAccountCreationDepositChannel",
          "statuses": [
            "201",
          ],
        },
        "openSwapDepositChannel": {
          "hasBody": true,
          "method": "POST",
          "path": "/api/openSwapDepositChannel",
          "statuses": [
            "201",
          ],
        },
      }
    `);
  });

  it('uses the request and response schemas', () => {
    const contract = createApiContract('mainnet');

    expect(contract.networkInfo.responses[200]).toBe(NetworkInfo);
    expect(contract.encodeVaultSwapData.responses[200]).toBe(EncodedVaultSwapData);
    expect(contract.openSwapDepositChannel.responses[201]).toBe(DepositChannelInfo);
    expect(contract.openAccountCreationDepositChannel.responses[201]).toBe(DepositChannelInfo);
  });

  it('uses the network specific request schemas', () => {
    const body = {
      srcAsset: { asset: 'BTC', chain: 'Bitcoin' },
      destAsset: { asset: 'ETH', chain: 'Ethereum' },
      destAddress: '0x72a5843cc08275C8171E582972Aa4fDa8C397B2A',
      amount: '100000',
      fillOrKillParams: {
        refundAddress: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', // testnet address
        retryDurationBlocks: 2,
        minPriceX128: '1',
      },
    };

    expect(createApiContract('perseverance').encodeVaultSwapData.body.safeParse(body).success).toBe(
      true,
    );
    expect(createApiContract('mainnet').encodeVaultSwapData.body.safeParse(body).success).toBe(
      false,
    );
  });

  // type-level assertions, checked by `pnpm typecheck`
  // eslint-disable-next-line @vitest/expect-expect
  it('infers the client and server types from the schemas', () => {
    type Route<K extends keyof ApiContract> = ApiContract[K];

    // client sends the schema input, server handlers receive the schema output
    expectTypeOf<ApiRequestBody<Route<'openSwapDepositChannel'>>>().toEqualTypeOf<
      z.input<ReturnType<typeof getOpenSwapDepositChannelSchema>>
    >();
    expectTypeOf<ApiParsedBody<Route<'openSwapDepositChannel'>>>().toEqualTypeOf<
      z.output<ReturnType<typeof getOpenSwapDepositChannelSchema>>
    >();
    expectTypeOf<ApiRequestBody<Route<'encodeCfParameters'>>>().toEqualTypeOf<
      z.input<ReturnType<typeof getParameterEncodingRequestSchema>>
    >();
    expectTypeOf<ApiRequestBody<Route<'encodeVaultSwapData'>>>().toEqualTypeOf<
      z.input<ReturnType<typeof getVaultSwapParameterEncodingRequestSchema>>
    >();
    expectTypeOf<ApiRequestBody<Route<'openAccountCreationDepositChannel'>>>().toEqualTypeOf<
      z.input<ReturnType<typeof getAccountCreationDepositChannelSchema>>
    >();
    expectTypeOf<ApiParsedBody<Route<'networkInfo'>>>().toEqualTypeOf<undefined>();

    expectTypeOf<ApiSuccessResponse<Route<'openSwapDepositChannel'>>>().toEqualTypeOf<{
      status: 201;
      body: z.output<typeof DepositChannelInfo>;
    }>();
    expectTypeOf<ApiSuccessResponse<Route<'networkInfo'>>>().toEqualTypeOf<{
      status: 200;
      body: z.output<typeof NetworkInfo>;
    }>();

    // routes without a body take no arguments
    expectTypeOf<ApiClient['networkInfo']>().parameters.toEqualTypeOf<[]>();
    expectTypeOf<ApiClient['encodeVaultSwapData']>().parameters.toEqualTypeOf<
      [{ body: z.input<ReturnType<typeof getVaultSwapParameterEncodingRequestSchema>> }]
    >();
  });

  it('narrows the response body by status', () => {
    const check = (res: Awaited<ReturnType<ApiClient['encodeVaultSwapData']>>) => {
      if (res.status === 200) {
        expectTypeOf(res.body).toEqualTypeOf<z.output<typeof EncodedVaultSwapData>>();
      } else {
        expectTypeOf(res.body).toBeUnknown();
        // @ts-expect-error -- 200 is excluded from the unexpected statuses
        expectTypeOf(res.status).toEqualTypeOf<200>();
      }
    };

    expect(check).toBeTypeOf('function');
  });
});
