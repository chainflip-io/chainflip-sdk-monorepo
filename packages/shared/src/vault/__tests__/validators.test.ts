import { NativeSwapParams, executeSwapParamsSchema } from '../validators';

const ETH_ADDRESS = '0x6Aa69332B63bB5b1d7Ca5355387EDd5624e181F2';
const DOT_ADDRESS = '5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX';
const BTC_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

const parse = (params: unknown): boolean =>
  executeSwapParamsSchema.safeParse(params).success;

describe('executeSwapParamsSchema', () => {
  it.each([
    {
      destChain: 'Bitcoin',
      destAddress: BTC_ADDRESS,
      destTokenSymbol: 'BTC',
    },
    {
      destChain: 'Polkadot',
      destAddress: DOT_ADDRESS,
      destTokenSymbol: 'DOT',
    },
    ...['FLIP', 'USDC'].map((destTokenSymbol) => ({
      destChain: 'Ethereum',
      destAddress: ETH_ADDRESS,
      destTokenSymbol,
    })),
  ] as Omit<NativeSwapParams, 'amount'>[])(
    'accepts valid native swaps (%p)',
    (params) => {
      expect(parse({ amount: '1', ...params })).toBe(true);
    },
  );

  it.each([
    {
      destChain: 'Bitcoin',
      destAddress: '0xOoOoOo',
      destTokenSymbol: 'BTC',
    },
    {
      destChain: 'Polkadot',
      destAddress: '0xOoOoOo',
      destTokenSymbol: 'DOT',
    },
    ...['FLIP', 'USDC', 'ETH'].map((destTokenSymbol) => ({
      destChain: 'Ethereum',
      destAddress: '0xOoOoOo',
      destTokenSymbol,
    })),
  ] as Omit<NativeSwapParams, 'amount'>[])(
    'rejects native swaps without an amount (%p)',
    (params) => {
      expect(parse(params)).toBe(false);
    },
  );

  it.each([
    ...['FLIP', 'USDC', 'ETH', 'DOT'].map((destTokenSymbol) => ({
      destChain: 'Bitcoin',
      destAddress: BTC_ADDRESS,
      destTokenSymbol,
    })),
    ...['FLIP', 'USDC', 'ETH', 'BTC'].map((destTokenSymbol) => ({
      destChain: 'Polkadot',
      destAddress: BTC_ADDRESS,
      destTokenSymbol,
    })),
    ...['DOT', 'BTC', 'ETH'].map((destTokenSymbol) => ({
      destChain: 'Ethereum',
      destAddress: ETH_ADDRESS,
      destTokenSymbol,
    })),
  ] as Omit<NativeSwapParams, 'amount'>[])(
    'rejects native swaps with mismatching chains and assets (%p)',
    (params) => {
      expect(parse({ amount: '1', ...params })).toBe(false);
    },
  );

  it.each([
    ...['FLIP', 'USDC'].flatMap((srcTokenSymbol) => [
      {
        destChain: 'Bitcoin',
        destAddress: BTC_ADDRESS,
        destTokenSymbol: 'BTC',
        srcTokenSymbol,
      },
      {
        destChain: 'Polkadot',
        destAddress: DOT_ADDRESS,
        destTokenSymbol: 'DOT',
        srcTokenSymbol,
      },
      {
        destChain: 'Ethereum',
        destAddress: ETH_ADDRESS,
        destTokenSymbol: 'ETH',
        srcTokenSymbol,
      },
    ]),
    {
      destChain: 'Ethereum',
      destAddress: ETH_ADDRESS,
      destTokenSymbol: 'USDC',
      srcTokenSymbol: 'FLIP',
    },
    {
      destChain: 'Ethereum',
      destAddress: ETH_ADDRESS,
      destTokenSymbol: 'FLIP',
      srcTokenSymbol: 'USDC',
    },
  ] as Omit<NativeSwapParams, 'amount'>[])(
    'accepts valid token swaps (%p)',
    (params) => {
      expect(parse({ amount: '1', ...params })).toBe(true);
    },
  );

  it.each([
    ...['ETH', 'DOT', 'BTC'].flatMap((srcTokenSymbol) => [
      {
        destChain: 'Bitcoin',
        destAddress: BTC_ADDRESS,
        destTokenSymbol: 'BTC',
        srcTokenSymbol,
      },
      {
        destChain: 'Polkadot',
        destAddress: DOT_ADDRESS,
        destTokenSymbol: 'DOT',
        srcTokenSymbol,
      },
      {
        destChain: 'Ethereum',
        destAddress: ETH_ADDRESS,
        destTokenSymbol: 'ETH',
        srcTokenSymbol,
      },
    ]),
  ] as Omit<NativeSwapParams, 'amount'>[])(
    'rejects tokens swaps with invalid srcTokenSymbols (%p)',
    (params) => {
      expect(parse({ amount: '1', ...params })).toBe(false);
    },
  );
});
