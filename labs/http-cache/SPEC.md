# HTTP cache response contract

Version 1. Implement only `responseFor({ policy, version, ifNoneMatch })` in `response.mjs`.
The supplied server validates `policy` as `fresh` or `validate`; version is a positive integer and ifNoneMatch is a single exact ETag string or null.
Return `{ status, headers }` with these two lowercase header names:

- `etag`: a quoted string such as `"summary-v1"` for version 1.
- `cache-control`: exactly `private, max-age=60` for fresh, or `private, no-cache` for validate.
- `status`: 304 when ifNoneMatch exactly equals the current ETag, otherwise 200.

Both statuses carry the same current ETag and cache policy.
The function is pure and must not mutate inputs.
The supplied server owns bodies: 200 returns `{ "version": 1, "total": 3 }` initially; 304 has no body.
Changing the origin increments version and total by one.

The page fetches the same policy-specific URL with normal browser caching.
A warm fresh entry can return its old version without another origin request even after the origin changes.
The validate policy sends its stored ETag, receives a network 304 when unchanged, and exposes the stored body as a successful browser response.
A changed origin returns 200 with the new body and ETag.
The origin log counts only `/api/summary` requests; fixture-control and asset requests are excluded.

The two policies demonstrate browser-private caching only.
ETag lists, weak comparison, authorization, shared caches, CDN overrides, SWR, cache expiry scheduling and a full RFC implementation are outside this bounded function.
See [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html) for the wider HTTP cache model.

## Prediction and intended checks

_Before implementation, predict the body version, origin request count and network status after each repeated fetch and origin change._
