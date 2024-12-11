## Quoting service

The quoting API is a simple request and response format built on top of
WebSockets using the Socket.IO library. Socket.IO is a library and protocol
built on top of WebSockets which is widely available across many languages.

### Connection and authentication

Before a connection can be established, a connecting client needs to be
authenticated. Authentication is performed using public key cryptography using
the ED25519 algorithm. A sample scipt on how to generate your key pair can be
found in [keys.py](./keys.py). It will generate the following output:

```
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIHJRRPXl8q+xKgAIY4iCiD6OcmFrVlNz86c5ZOxJwJvQ
-----END PRIVATE KEY-----

-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA3vLfE6y0smDceI6N4NaC3gPqNEHi6L/NEvuBOrpO1dg=
-----END PUBLIC KEY-----
```

The public key will need to be shared with the Chainflip team along with your
LP Account ID (`cF...`).

During the connection phase, a JSON `auth` object is passed to the `connect`
function with with the following shape:

```jsonc
{
  "client_version": "2",
  // the current UNIX timestamp in milliseconds
  "timestamp": 1713183254094,
  // your Chainflip Account ID
  "account_id": "cFNz3kSjvCHubkrtfYtBkzY2WpACDmXqQ9YGxbMgRD2iu1LCc",
  // explained below
  "signature": "uJ7Caq4w/b1epVBN8yWk51xrPePI0B7mymCYXG2NT8kiDzKBQX7QGJe7yZm5e5ByfP4M1UP5B+++QMuaHBwqAA==",
  // the assets that you will be providing quotes for
  "quoted_assets": [
    { "chain": "Bitcoin", "asset": "BTC": },
    { "chain": "Solana", "asset": "SOL": },
    { "chain": "Ethereum", "asset": "ETH": },
    { "chain": "Ethereum", "asset": "FLIP": }
  ]
}
```

The `signature` property is a base 64 encoding of the signature of the
`account_id` property concatenated together with the `timestamp`, e.g.:
`cFNz3kSjvCHubkrtfYtBkzY2WpACDmXqQ9YGxbMgRD2iu1LCc1713183254094`. This string is
signed using your private key and verified with the public key you provide.

The `timestamp` should must be at most +/- 30 seconds different from the time of
the server at time of signature verification.

The `quoted_assets` are a list of assets that you can expect to provide quotes
for. You will only receive quote requests for assets in this list. You are not
required to provide quotes for every request. See examples below for more
information on how to return an empty response. Providing an accurate list of
quoted assets helps us reduce the latency to the end users by reducing the
number of requests we make to liquidity providers for limit orders.

An example of this authentication handshake can be found in the
[sample client](./quoting_client.py).

### Quoting

After successfully authenticating, the client will start to receive quote
requests. The server will emit the event `quote_request` with the following
payload:

```ts
type Leg = {
  // always in the atomic unit of asset being sold, i.e. Wei for Ethereum
  amount: string;
  // all supported assets besides USDC on Ethereum
  base_asset: { chain: string; asset: string };
  quote_asset: { chain: 'Ethereum'; asset: 'USDC' };
  side: 'BUY' | 'SELL';
};

type Request = {
  request_id: string;
  legs: [Leg] | [Leg, Leg];
};
```

The client must emit a response with the event `quote_response` with the
following shape:

```ts
type Tick = number;
// always in the atomic unit of asset being sold, i.e. Wei for Ethereum
type AssetAmount = string;

type LimitOrder = [Tick, AssetAmount];

type Response = {
  // this must be the same `request_id` from the request
  request_id: string;
  legs: [LimitOrder[]] | [LimitOrder[], LimitOrder[]];
};
```

If the quote has two legs, both legs are not required to be quoted, but there
must be a placeholder empty array in order to preserve the order of the legs.

The `request_id` from the request must be included in the response.

Malformed responses are ignored.

### Examples

#### Single leg

Quoting server emits the following `quote_request` event for a swap from $FLIP
to $USDC:

```jsonc
{
  "request_id": "018ee1c7-b949-71f2-889e-a2284cee7712",
  "legs": [
    {
      "amount": "1000000000000000000", // 1 $FLIP
      "base_asset": { "chain": "Ethereum", "asset": "FLIP" },
      "quote_asset": { "chain": "Ethereum", "asset": "USDC" },
      "side": "SELL",
    },
  ],
}
```

The response should contain orders for the opposite direction. For `SELL`
orders, you should respond with `BUY` orders. The client receives the reponse
and emits the following `quote_response` event:

```jsonc
{
  "request_id": "018ee1c7-b949-71f2-889e-a2284cee7712",
  "legs": [
    [
      [-268100, "1137934"],
      [-268000, "1149370"],
    ],
  ],
}
```

This response means you intend to open two `BUY` orders in response to the
`SELL` request. These orders will buy approximately 0.5 $FLIP each, thus filling
the order.

#### Double leg

Quoting server emits the following quote_request event to sell $FLIP for $USDC
and buy $USDT with $USDC:

```jsonc
{
  "request_id": "018ee1da-e21f-7f93-a214-1f0fc465843e",
  "legs": [
    {
      "amount": "1000000000000000000", // 1 FLIP
      "base_asset": { "chain": "Ethereum", "asset": "FLIP" },
      "quote_asset": { "chain": "Ethereum", "asset": "USDC" },
      "side": "SELL",
    },
    {
      "amount": "5000000", // 5 USDC
      "base_asset": { "chain": "Ethereum", "asset": "USDT" },
      "quote_asset": { "chain": "Ethereum", "asset": "USDC" },
      "side": "BUY",
    },
  ],
}
```

The client receives the reponse and emits the following `quote_response` event:

```jsonc
{
  "request_id": "018ee1da-e21f-7f93-a214-1f0fc465843e",
  "legs": [
    [], // for the first leg there is no quote provided
    [[0, "5000000"]],
  ],
}
```
