// eslint-disable-next-line no-undef
globalThis.fetch = jest
  .fn()
  .mockRejectedValue(new Error('fetch is not implemented in this environment'));
