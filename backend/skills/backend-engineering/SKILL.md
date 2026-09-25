---
name: backend-engineering
description: Build and review server-side code - services, handlers, background jobs, data access, integrations - with correct error handling, input validation, observability, and safe data changes. Use for "add an endpoint", "write a service", "fix this handler", "add a job", "why is this failing in production", database access, queues, auth checks, or any backend code change.
---

# Backend engineering

Server code is judged by how it fails. Design for the request that is malformed, the dependency that is down, and the deploy that has to be rolled back.

## Before touching code

1. **Trace the existing path.** Find how a comparable request enters the system, what layers it passes through (router, handler, service, repository), and where errors are turned into responses. Add code in the same layers, with the same names.
2. **Find the contracts.** Request and response schemas, database schema, and any consumers of the thing you are changing. A change to a response shape is a change to every client.
3. **Locate the tests** for the neighbouring code and plan to add yours beside them.

## Handling requests

- Validate at the boundary, once. Reject bad input with a 4xx and a message that names the field. Trust nothing after the boundary needs re-checking.
- Authenticate and authorize before doing work. Authorization checks live where the resource is loaded, not scattered in the handler.
- Idempotency for anything a client might retry: use an idempotency key or make the operation naturally repeatable.
- Time-box every outbound call. No network call without a timeout.
- Return the right status code. 400 malformed, 401 unauthenticated, 403 unauthorized, 404 missing, 409 conflict, 422 semantic error, 429 rate limited, 500 only for genuine bugs.

## Errors

- Throw typed errors with a status and a stable code. Convert them to responses in one place.
- Never swallow an error silently. If you catch it, either handle it fully or log it with context and rethrow.
- Log the request id, the operation, and the identifiers involved. Do not log secrets, tokens, or full request bodies.
- Distinguish expected failures (validation, not found) from unexpected ones (bugs, outages) in both logging level and metrics.

## Data

- Every write is inside a transaction if it touches more than one row or table.
- Migrations are additive first: add the column, backfill, switch reads, then drop. Never rename in one step.
- Reads that can grow unbounded get pagination and a maximum page size.
- Avoid N+1 queries. Batch or join.
- Treat the database as shared state: assume concurrent writers and use constraints and unique indexes to enforce invariants, not application checks alone.

## Background work

- Jobs are idempotent and safe to retry. Record progress so a crash mid-way resumes rather than repeats.
- Bound retries with backoff and a dead-letter path.
- Long-running work reports progress and can be cancelled.

## Observability

- One structured log line per request with method, path, status, duration, and request id.
- Metrics for rate, errors, and duration of every handler and every outbound dependency.
- Health endpoint that checks dependencies the process cannot work without.

## Security basics

- Parameterized queries only. No string-built SQL or shell commands from user input.
- Secrets from the environment or a secret store, never from source.
- Deny by default on new routes; add the permission explicitly.

## Before finishing

Run the test suite and the linter. Add a test for the happy path and for at least one failure path. If the change touches data, write down the rollback step.
