import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { noop } from '../../utils/function.js';

describe('env', () => {
  beforeEach(() => {
    process.env = {
      CHAINFLIP_NETWORK: 'mainnet',
      RPC_NODE_HTTP_URL: 'https://chainflip.rpc',
      RPC_NODE_WSS_URL: 'wss://chainflip.rpc',
      RPC_BROKER_HTTPS_URL: 'https://broker.rpc',
      INGEST_GATEWAY_URL: 'https://ingest.gateway',
    };
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('parses the env variables correctly for mainnet', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(noop);
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
        "DCA_DISABLED_INTERNAL_ASSETS": Set {},
        "DCA_SELL_CHUNK_SIZE_USD": {},
        "DISABLED_DEPOSIT_INTERNAL_ASSETS": Set {},
        "DISABLED_DESTINATION_INTERNAL_ASSETS": Set {},
        "DISABLE_BOOST_QUOTING": false,
        "DISABLE_DCA_QUOTING": false,
        "DISABLE_QUOTING": false,
        "DISABLE_RECOMMENDED_LIVE_PRICE_SLIPPAGE": false,
        "FULLY_DISABLED_INTERNAL_ASSETS": Set {
          "HubDot",
          "Dot",
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
        "QUOTER_DCA_V2_DEPOSIT_ASSETS": Set {},
        "QUOTER_DCA_V2_DESTINATION_ASSETS": Set {},
        "QUOTER_USE_MEV_FACTOR": false,
        "QUOTE_TIMEOUT": 1000,
        "QUOTING_BASE_SLIPPAGE": {},
        "RATE_LIMIT_MAX_REQUESTS": 200,
        "RATE_LIMIT_WINDOW_MS": 60000,
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
            "asset": "Ton",
            "message": "incorrect asset in internal asset csv",
            "name": "FULLY_DISABLED_INTERNAL_ASSETS",
          },
        ],
      ]
    `,
    );
  });

  it('parses the env variables correctly for testnet', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(noop);
    process.env.CHAINFLIP_NETWORK = 'perseverance';
    process.env.FULLY_DISABLED_INTERNAL_ASSETS = 'Ton,HubDot';
    process.env.DCA_100K_USD_PRICE_IMPACT_PERCENT = JSON.stringify({
      Flip: 0.1,
    });

    const { default: env } = await vi.importActual('../env.js');

    expect(env).toMatchInlineSnapshot(`
      {
        "BROKER_COMMISSION_BPS": 0,
        "CHAINFLIP_NETWORK": "perseverance",
        "DCA_100K_USD_PRICE_IMPACT_PERCENT": {
          "Flip": 0.1,
        },
        "DCA_BUY_CHUNK_SIZE_USD": {},
        "DCA_CHUNK_INTERVAL_BLOCKS": 2,
        "DCA_DEFAULT_SELL_CHUNK_SIZE_USD": 10000,
        "DCA_DISABLED_INTERNAL_ASSETS": Set {},
        "DCA_SELL_CHUNK_SIZE_USD": {},
        "DISABLED_DEPOSIT_INTERNAL_ASSETS": Set {},
        "DISABLED_DESTINATION_INTERNAL_ASSETS": Set {},
        "DISABLE_BOOST_QUOTING": false,
        "DISABLE_DCA_QUOTING": false,
        "DISABLE_QUOTING": false,
        "DISABLE_RECOMMENDED_LIVE_PRICE_SLIPPAGE": false,
        "FULLY_DISABLED_INTERNAL_ASSETS": Set {
          "HubDot",
          "Dot",
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
        "QUOTER_DCA_V2_DEPOSIT_ASSETS": Set {},
        "QUOTER_DCA_V2_DESTINATION_ASSETS": Set {},
        "QUOTER_USE_MEV_FACTOR": false,
        "QUOTE_TIMEOUT": 1000,
        "QUOTING_BASE_SLIPPAGE": {},
        "RATE_LIMIT_MAX_REQUESTS": 200,
        "RATE_LIMIT_WINDOW_MS": 60000,
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
