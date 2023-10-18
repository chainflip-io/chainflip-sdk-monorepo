const res = await fetch('https://chainflip-swap-backspin.staging/swaps', {
  headers: {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
  },
  referrer: 'https://swap-backspin.staging/',
  referrerPolicy: 'strict-origin-when-cross-origin',
  body: JSON.stringify({
    destAddress: '5FNDF6FHtThru6qr56ztW2nuCUsfd1MoPXUjAe4tMyc2S5L6',
    srcAsset: 'ETH',
    destAsset: 'DOT',
    srcChain: 'Ethereum',
    destChain: 'Polkadot',
    amount: '1000000000000000000',
  }),
  method: 'POST',
});

console.log(await res.json());
