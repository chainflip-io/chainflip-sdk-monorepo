import { encodeAddress, reverseHex } from '../bitcoin';

describe(encodeAddress, () => {
  it.each([
    [
      '0x67bfb30cec6254a7e39b6d4295fbdfa85b03d02baff43768831c708b9134b7fd',
      'bc1pv7lmxr8vvf220cumd4pft77l4pds85pt4l6rw6yrr3cghyf5kl7sq76puk',
      'mainnet',
    ],
    [
      '0xc9347a9e6202a8248fec4340bf6b757cd1dbd485676044d0610b0b350d6dce5c',
      'tb1pey6848nzq25zfrlvgdqt76m40ngah4y9vasyf5rppv9n2rtdeewqsvg9ul',
      'perseverance',
    ],
    [
      '0x594ee85a12da9c1138f562e964721c7ed77f7c30a322bd2a68dc169415476b49',
      'tb1pt98wsksjm2wpzw84vt5kgusu0mth7lps5v3t62ngmstfg928ddys0gsl5d',
      'perseverance',
    ],
    [
      '0xf6e7ffe81c0d7f1fe10865fcb56b7540c9d7488f6bf08ecc57d66a296d4d88d6',
      'bcrt1p7mnll6qup4l3lcggvh7t26m4gryawjy0d0cganzh6e4zjm2d3rtqt9usqx',
      'backspin',
    ],
  ] as const)('encodes encode %s', (pubkey, address, network) => {
    expect(encodeAddress(pubkey, network)).toEqual(address);
  });
});

describe(reverseHex, () => {
  it.each([
    [
      '0x2ad051fefd2448a750ece819c24f57b996084b4278dbe3b9d5d8334a6c35766e',
      '6e76356c4a33d8d5b9e3db78424b0896b9574fc219e8ec50a74824fdfe51d02a',
    ],
    [
      '0xb3551b30622e4fd7f615995838f06897009851881e024320bf52c4b3ca938c03',
      '038c93cab3c452bf2043021e885198009768f038589915f6d74f2e62301b55b3',
    ],
    [
      'b3551b30622e4fd7f615995838f06897009851881e024320bf52c4b3ca938c03',
      '038c93cab3c452bf2043021e885198009768f038589915f6d74f2e62301b55b3',
    ],
    [undefined, undefined],
  ] as const)('reverses hex correctly %s', (hex, reversed) => {
    expect(reverseHex(hex)).toEqual(reversed);
  });
});
