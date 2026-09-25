---
name: api-design
description: Design and review HTTP and RPC APIs - resource naming, request and response shapes, error format, versioning, pagination, auth, and OpenAPI specs. Use for "design an API", "review this endpoint", "how should this route look", "write the OpenAPI spec", webhook design, or any question about the contract between a client and a server.
---

# API design

An API is a promise. Design it so it is obvious to use correctly, hard to use incorrectly, and possible to change without breaking anyone.

## Start from use cases, not tables

List the three to five things a client actually does, in the client's words. Design the resources and operations that make those flows short. An API that mirrors the database schema pushes the joins onto every consumer.

## Resources and naming

- Nouns for resources, plural, lowercase, hyphenated: `/orders`, `/order-items`.
- Hierarchy only when the child cannot exist without the parent: `/orders/{id}/items`. Otherwise keep it flat and filter.
- Verbs are HTTP methods. When an action does not fit a method, model it as a resource (`POST /orders/{id}/cancellations`) rather than `/cancelOrder`.
- Identifiers are opaque strings. Do not leak auto-increment integers if enumeration is a concern.
- Consistent casing in JSON. Pick `camelCase` or `snake_case` once and never mix.

## Methods and status codes

| Intent | Method | Success | Notes |
|---|---|---|---|
| Read one | GET | 200 | Cacheable, no body |
| List | GET | 200 | Paginated, filterable |
| Create | POST | 201 + Location | Return the created resource |
| Replace | PUT | 200 | Whole resource, idempotent |
| Partial update | PATCH | 200 | Merge patch or JSON patch, say which |
| Delete | DELETE | 204 | Idempotent; a second delete is 204 or 404, document which |

Errors use one shape everywhere:

```json
{ "error": { "code": "order_not_found", "message": "Order 123 does not exist", "details": {} } }
```

`code` is stable and machine-readable; `message` is for humans and may change.

## Requests and responses

- Every field has a type, a nullability, and a meaning. Optional means "may be absent", nullable means "may be null"; do not conflate them.
- Dates are ISO 8601 in UTC. Money is an integer in minor units plus a currency code. Never floats for money.
- Return the full resource after a write so clients do not need a second call.
- Envelopes only when needed for pagination metadata: `{ "data": [...], "nextCursor": "..." }`.

## Pagination, filtering, sorting

- Cursor pagination by default; offset only for small, stable sets.
- Filters as query parameters with explicit operators when needed: `?status=open&createdAfter=2026-01-01`.
- Sorting: `?sort=-createdAt,name`. Document the default.
- A maximum page size, enforced.

## Versioning and change

- Additive changes (new optional fields, new endpoints) need no version bump.
- Breaking changes (removing or renaming fields, changing types, changing semantics) get a new major version in the path (`/v2/`) or a header, chosen once for the whole API.
- Deprecate with a date and a `Deprecation` header before removing anything.

## Auth and safety

- Bearer tokens in the `Authorization` header; never in query strings.
- Scopes or roles documented per endpoint.
- Rate limits returned in headers (`RateLimit-Limit`, `RateLimit-Remaining`, `Retry-After`).
- Idempotency keys for POSTs that create side effects clients might retry.
- Webhooks: signed payloads, retry with backoff, and an event id so receivers can dedupe.

## Deliverable

For a new or changed API, produce: the endpoint table (method, path, purpose, auth), request and response examples for each, the error codes it can return, and an OpenAPI 3 fragment if the project keeps a spec. Review against the existing endpoints for consistency before finishing; consistency with the current API beats textbook purity.
