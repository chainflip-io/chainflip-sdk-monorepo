import { encodeAddress } from '@chainflip/bitcoin';
import { isValidSolanaAddress } from '@chainflip/solana';
import * as base58 from '@chainflip/utils/base58';
import { hexToBytes } from '@chainflip/utils/bytes';
import * as ss58 from '@chainflip/utils/ss58';
import { isHex } from '@chainflip/utils/string';
import { HexString } from '@chainflip/utils/types';
import assert from 'assert';
import * as ethers from 'ethers';
import { z, ZodErrorMap } from 'zod';
import {
  ChainflipNetwork,
  ChainflipNetworks,
  InternalAsset,
  InternalAssets,
  Chains,
  Assets,
  isValidAssetAndChain,
  UncheckedAssetAndChain,
  AssetAndChain,
} from './enums';
import { isString } from './guards';
import {
  validateBitcoinMainnetAddress,
  validateBitcoinRegtestAddress,
  validateBitcoinTestnetAddress,
} from './validation/addressValidation';

const chainflipSS58Prefix = 2112;

const enumValues = Object.values as <T>(
  obj: T,
) => T extends Record<string, never> ? never : [T[keyof T], ...T[keyof T][]];

const safeStringify = (obj: unknown) =>
  JSON.stringify(obj, (key, value) => (typeof value === 'bigint' ? value.toString() : value));

const errorMap: ZodErrorMap = (_issue, context) => ({
  message: `received: ${safeStringify(context.data)}`,
});
export const string = z.string({ errorMap });
export const number = z.number({ errorMap });
export const booleanString = string
  .regex(/^(true|false)$/i)
  .transform((v) => v.toLowerCase() === 'true');
export const numericString = string.regex(/^[0-9]+$/);
export const numericOrEmptyString = string.regex(/^[0-9]*$/);
export const hexString = string.refine((v): v is `0x${string}` => /^0x[0-9a-f]*$/i.test(v));
export const hexStringWithMaxByteSize = (maxByteSize: number) =>
  hexString.refine((val) => val.length / 2 <= maxByteSize + 1, {
    message: `String must be less than or equal to ${maxByteSize} bytes`,
  });

export const btcAddress = (network: ChainflipNetwork | 'localnet') => {
  if (network === 'mainnet') {
    return string.regex(/^(1|3|bc1)/).refine(validateBitcoinMainnetAddress, (address) => ({
      message: `"${address}" is not a valid Bitcoin mainnet address`,
    }));
  }

  return z.union([
    string.regex(/^(m|n|2|tb1)/).refine(validateBitcoinTestnetAddress, (address) => ({
      message: `"${address}" is not a valid Bitcoin testnet address`,
    })),
    string.regex(/^bcrt1/).refine(validateBitcoinRegtestAddress, (address) => ({
      message: `"${address}" is not a valid Bitcoin regtest address`,
    })),
  ]);
};

export const DOT_PREFIX = 0;

export const dotAddress = z
  .union([string, hexString])
  .transform((arg) => {
    try {
      if (arg.startsWith('0x')) {
        return ss58.encode({ data: arg as HexString, ss58Format: DOT_PREFIX });
      }
      // if substrate encoded, then decode and re-encode to dot format
      return ss58.encode({ data: ss58.decode(arg).data, ss58Format: DOT_PREFIX });
    } catch {
      return null;
    }
  })
  .refine(isString, {
    message: `address is not a valid polkadot address`,
  });

export const ethereumAddress = hexString.refine(
  (address) => ethers.isAddress(address),
  (address) => ({ message: `${address} is not a valid Ethereum address` }),
);

export const chainflipAddress = string.refine(
  (address) => address.startsWith('cF') && ss58.decode(address),
  (address) => ({ message: `${address} is not a valid Chainflip address` }),
);

export const solanaAddress = string.refine(isValidSolanaAddress, (address) => ({
  message: `${address} is not a valid Solana address`,
}));

export const u64 = numericString.transform((arg) => BigInt(arg));

export const u128 = z.union([number, numericString, hexString]).transform((arg) => BigInt(arg));

export const unsignedInteger = z.union([u128, z.number().transform((n) => BigInt(n))]);

export const rustEnum = <U extends string, T extends readonly [U, ...U[]]>(values: T) =>
  z.object({ __kind: z.enum(values) }).transform(({ __kind }) => __kind!);

export const internalAssetEnum = rustEnum(enumValues(InternalAssets));
export const chainEnum = rustEnum(enumValues(Chains));

export const chain = z.nativeEnum(Chains);
export const asset = z.nativeEnum(Assets);
export const chainflipNetwork = z.nativeEnum(ChainflipNetworks);

export const uncheckedAssetAndChain = z.object({
  asset: z.string(),
  chain: z.string(),
});

export const assetAndChain = uncheckedAssetAndChain.refine((value): value is AssetAndChain =>
  isValidAssetAndChain(value as UncheckedAssetAndChain),
);

export const swapType = z.union([
  z
    .object({ __kind: z.literal('CcmPrincipal'), value: unsignedInteger })
    .transform(({ value: ccmId }) => ({ type: 'PRINCIPAL' as const, ccmId })),
  z
    .object({ __kind: z.literal('CcmGas'), value: unsignedInteger })
    .transform(({ value: ccmId }) => ({ type: 'GAS' as const, ccmId })),
  z.object({ __kind: z.literal('Swap') }).transform(() => ({ type: 'SWAP' as const })),
]);

export const accountId = z
  .union([
    hexString, //
    string.regex(/^[a-f\d]$/i).transform<`0x${string}`>((value) => `0x${value}`),
  ])
  .transform(
    (value) => ss58.encode({ data: value, ss58Format: chainflipSS58Prefix }) as `cF${string}`,
  );

export const actionSchema = z.union([
  z.object({ __kind: z.literal('Swap'), swapId: u128 }),
  z.object({ __kind: z.literal('LiquidityProvision'), lpAccount: hexString }),
  z.object({
    __kind: z.literal('CcmTransfer'),
    principalSwapId: u128.nullable().optional(),
    gasSwapId: u128.nullable().optional(),
  }),
  z.object({
    __kind: z.literal('NoAction'),
  }),
  z.object({
    __kind: z.literal('BoostersCredited'),
    prewitnessedDepositId: u128,
  }),
]);

export const bitcoinScriptPubKey = (network: ChainflipNetwork) =>
  z
    .union([
      z.object({ __kind: z.literal('P2PKH'), value: hexString }),
      z.object({ __kind: z.literal('P2SH'), value: hexString }),
      z.object({ __kind: z.literal('P2WPKH'), value: hexString }),
      z.object({ __kind: z.literal('P2WSH'), value: hexString }),
      z.object({ __kind: z.literal('Taproot'), value: hexString }),
      z.object({ __kind: z.literal('OtherSegwit'), version: z.number(), program: hexString }),
    ])
    .transform((script) => {
      if (script.__kind === 'OtherSegwit') {
        throw new Error('OtherSegwit scriptPubKey not supported');
      }

      return encodeAddress(script.value, script.__kind, network);
    });

export const depositAddressSchema = (network: ChainflipNetwork) =>
  z.union([hexString, bitcoinScriptPubKey(network)]);

export const encodeDotAddress = <T extends { asset: InternalAsset; depositAddress: string }>(
  args: T,
): T => {
  if (args.asset === 'Dot') {
    assert(isHex(args.depositAddress));
    return {
      ...args,
      depositAddress: ss58.encode({ data: args.depositAddress, ss58Format: DOT_PREFIX }),
    };
  }
  return args;
};

const hexEncodedBase58Address = hexString.transform((value) => base58.encode(hexToBytes(value)));
const extractAddress = <T extends { value: string }>({ value }: T) => value;

export const foreignChainAddress = (network: ChainflipNetwork) =>
  z.union([
    z.object({ __kind: z.literal('Eth'), value: hexString }).transform(extractAddress),
    z
      .object({ __kind: z.literal('Dot'), value: hexString })
      .transform(({ value }) => ss58.encode({ data: value, ss58Format: 0 })),
    z
      .object({ __kind: z.literal('Btc'), value: bitcoinScriptPubKey(network) })
      .transform(extractAddress),
    z.object({ __kind: z.literal('Arb'), value: hexString }).transform(extractAddress),
    z
      .object({ __kind: z.literal('Sol'), value: hexEncodedBase58Address })
      .transform(extractAddress),
  ]);
