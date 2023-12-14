import { depositReceivedArgs } from '../depositReceived';

describe('depositReceivedArgs', () => {
  it.each([
    {
      asset: { __kind: 'Btc' },
      amount: '1000000',
      depositAddress: {
        value:
          '0x69e988bde97e4b988f1d11fa362118c4bdf5e32c45a6e7e89fde3106b764bebd',
        __kind: 'Taproot',
      },
      depositDetails: {
        txId: '0x14fd88f956c399e64356546fea41ba234670a7b63c8e2b7e81c8f1ae9011b0d7',
        vout: 1,
      },
    },
    {
      asset: { __kind: 'Flip' },
      amount: '9853636405123772134',
      depositAddress: '0xe0c0ca3540ddd2fc6244e62aa8c8f70c7021ff7f',
    },
    {
      asset: { __kind: 'Usdc' },
      amount: '1000000000',
      depositAddress: '0x9a53bd378c459f71a74acd96bfcd64ed96d92a8e',
    },
    {
      asset: { __kind: 'Eth' },
      amount: '100000000000000000',
      depositAddress: '0xf7b277413fd3e1f1d1e631b1b121443889e46719',
    },
    {
      asset: { __kind: 'Dot' },
      amount: '30000000000',
      depositAddress:
        '0x2d369b6db7f9dc6f332ca5887208d5814dcd759a516ee2507f9582d8b25d7b97',
    },
  ])('parses the event', (args) => {
    expect(depositReceivedArgs.safeParse(args).success).toBe(true);
  });
});
