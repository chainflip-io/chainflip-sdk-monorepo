jest.mock('../config/env', () => ({
  RPC_NODE_HTTP_URL: '',
  START_HTTP_SERVICE: false,
  START_PROCESSOR: false,
  SWAPPING_APP_PORT: 8080,
  BITCOIN_DEPOSIT_TRACKER_URL: '',
  RPC_BROKER_HTTPS_URL: '',
  RPC_NODE_WSS_URL: '',
  CHAINFLIP_NETWORK: 'perseverance',
  QUOTE_TIMEOUT: 1000,
  NODE_ENV: 'test',
  CHAINALYSIS_API_KEY: undefined,
  INGEST_GATEWAY_URL: '',
  PROCESSOR_BATCH_SIZE: 50,
  PROCESSOR_TRANSACTION_TIMEOUT: 10_000,
  REDIS_URL: undefined,
  MAINTENANCE_MODE: false,
  DISABLED_INTERNAL_ASSETS: [],
  MAX_CHANNELS_OPEN_PER_ADDRESS: 10,
  DISABLE_QUOTING: false,
}));
