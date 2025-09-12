import { beforeEach, describe, expect, it, vi } from 'vitest';
import { noop } from '../../utils/function.js';

describe('env', () => {
  beforeEach(() => {
    // bare minimum env
    process.env = {
      CHAINFLIP_NETWORK: 'mainnet',
      RPC_NODE_HTTP_URL: 'https://chainflip.rpc',
      RPC_NODE_WSS_URL: 'wss://chainflip.rpc',
      RPC_BROKER_HTTPS_URL: 'https://broker.rpc',
      INGEST_GATEWAY_URL: 'https://ingest.gateway',
    };
  });

  it('parses the env variables correctly', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(noop);
    process.env.QUOTING_REPLENISHMENT_FACTOR = JSON.stringify({
      Usdt: 2.1,
      Flip: true,
      Flop: '12',
    });
    process.env.FULLY_DISABLED_INTERNAL_ASSETS = 'Ton,HubDot';
    process.env.DCA_100K_USD_PRICE_IMPACT_PERCENT = JSON.stringify({
      Flip: 0.1,
    });

    const { default: env } = await vi.importActual('../env.js');
    expect(env).toMatchInlineSnapshot(`
      {
        "BROKER_COMMISSION_BPS": 0,
        "CHAINFLIP_NETWORK": "mainnet",
        "DCA_100K_USD_PRICE_IMPACT_PERCENT": {
          "Flip": 0.1,
        },
        "DCA_BUY_CHUNK_SIZE_USD": {},
        "DCA_CHUNK_INTERVAL_BLOCKS": 2,
        "DCA_DEFAULT_SELL_CHUNK_SIZE_USD": 10000,
        "DCA_SELL_CHUNK_SIZE_USD": {},
        "DISABLED_DEPOSIT_INTERNAL_ASSETS": Set {},
        "DISABLED_DESTINATION_INTERNAL_ASSETS": Set {},
        "DISABLE_BOOST_QUOTING": false,
        "DISABLE_DCA_QUOTING": false,
        "DISABLE_QUOTING": false,
        "FULLY_DISABLED_INTERNAL_ASSETS": Set {
          "HubDot",
        },
        "INGEST_GATEWAY_URL": "https://ingest.gateway",
        "LIQUIDITY_WARNING_THRESHOLD": -5,
        "MAINTENANCE_MODE": false,
        "MAX_CHANNELS_OPEN_PER_ADDRESS": 25,
        "NODE_ENV": "production",
        "PROCESSOR_BATCH_SIZE": 50,
        "PROCESSOR_TRANSACTION_TIMEOUT": 10000,
        "QUOTER_BALANCE_TOLERANCE_PERCENT": 10,
        "QUOTER_BALANCE_TRACKER_ACTIVE": true,
        "QUOTER_USE_DCA_LIMIT_ORDERS": true,
        "QUOTER_USE_MEV_FACTOR": false,
        "QUOTE_TIMEOUT": 1000,
        "QUOTING_BASE_SLIPPAGE": {},
        "QUOTING_REPLENISHMENT_FACTOR": {
          "Usdt": [
            21n,
            10n,
          ],
        },
        "RPC_BROKER_HTTPS_URL": "https://broker.rpc",
        "RPC_NODE_HTTP_URL": "https://chainflip.rpc",
        "RPC_NODE_WSS_URL": "wss://chainflip.rpc",
        "SOLANA_TX_REF_QUEUE_INTERVAL": 1000,
        "STABLE_COIN_SLIPPAGE_MIN_PRICE": 0.995,
        "START_HTTP_SERVICE": false,
        "START_PROCESSOR": false,
        "SWAPPING_APP_PORT": 8080,
      }
    `);
    expect(warnSpy.mock.calls).toMatchInlineSnapshot(
      `
      [
        [
          {
            "error": "[
        {
          "code": "invalid_type",
          "expected": "number",
          "received": "boolean",
          "path": [],
          "message": "Expected number, received boolean"
        }
      ]",
            "key": "Flip",
            "message": "invalid value in internal asset map",
            "name": "QUOTING_REPLENISHMENT_FACTOR",
            "value": true,
          },
        ],
        [
          {
            "error": "[
        {
          "received": "Flop",
          "code": "invalid_enum_value",
          "options": [
            "Usdc",
            "Usdt",
            "Flip",
            "Eth",
            "Dot",
            "Btc",
            "ArbUsdc",
            "ArbEth",
            "Sol",
            "SolUsdc",
            "HubDot",
            "HubUsdt",
            "HubUsdc"
          ],
          "path": [],
          "message": "Invalid enum value. Expected 'Usdc' | 'Usdt' | 'Flip' | 'Eth' | 'Dot' | 'Btc' | 'ArbUsdc' | 'ArbEth' | 'Sol' | 'SolUsdc' | 'HubDot' | 'HubUsdt' | 'HubUsdc', received 'Flop'"
        }
      ]",
            "key": "Flop",
            "message": "invalid asset in internal asset map",
            "name": "QUOTING_REPLENISHMENT_FACTOR",
          },
        ],
        [
          {
            "asset": "Ton",
            "message": "incorrect asset in internal asset csv",
            "name": "FULLY_DISABLED_INTERNAL_ASSETS",
          },
        ],
      ]
    `,
    );
  });
});
