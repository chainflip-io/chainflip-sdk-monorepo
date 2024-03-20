# Changelog

Note: the swap SDK does NOT adhere to semantic versioning. The major and minor
correspond to the runtime version of the Chainflip protocol that the SDK is
intended to be used with.

Deprecated functionality will be retained for two releases after the release in
which it is deprecated.

## Deprecation warnings

### 1.3.0

- `getQuote` can respond with a 500 status code and a JSON response body with an
  string `error` field. This field has been replaced by `message` to be inline
  with how errors are returned in other parts of the API.

## 1.3.0

### Fixed

- `getQuote` can respond with a 500 status code and a JSON response body with an
  string `error` field. This field has been duplicated as `message` to be inline
  with how errors are handled in the other methods. The `error` field has been
  deprecated and will be removed after 1.4.0
- removed the `0x` prefix from Bitcoin transaction hashes in the status response
