# PR5 storage handoff

## Scope

PR5 adds server-side turn persistence after `/api/chat` has produced a
schema-valid response. Storage is attached to the same turn boundary created in
PR4:

```text
ASR userText -> fresh per-turn snapshot or null -> /api/chat -> validated response -> storage
```

## Behavior to preserve

- The storage layer receives the same `snapshot` payload that was submitted to
  `/api/chat`; it must not capture another frame.
- Completed turns are written to:
  - `snapshots/{sessionId}/{turnId}.webp`
  - `turns/{sessionId}/{turnId}.json`
  - `sessions/{sessionId}.json`
- Turn JSON contains the original chat request and the validated chat response,
  including the storage URLs that are returned to the browser.
- Session JSON stores a lightweight ordered list of completed turns, including
  the user text, reply text, snapshot URL, and turn JSON URL.
- Snapshot URL is `null` when the request has no snapshot.
- Storage failures are non-blocking: `/api/chat` still returns the AI response
  with `qiniu: { snapshotUrl: null, turnJsonUrl: null }`.
- The fake storage provider remains the default for local development and CI.

## Provider notes

- `STORAGE_PROVIDER=fake` uses an in-memory fake provider for the lifetime of
  the server process and the configured `QINIU_PUBLIC_DOMAIN` only to produce
  deterministic URLs.
- `STORAGE_PROVIDER=qiniu` uses server-only Qiniu credentials. Do not expose
  `QINIU_ACCESS_KEY` or `QINIU_SECRET_KEY` to client components.
- `QINIU_UPLOAD_URL` can override the built-in region upload host mapping.

## Regression coverage

Keep these tests when changing PR5 behavior:

- `tests/unit/storage.test.ts`
  - persists the submitted snapshot and merges turn metadata into session JSON
  - skips snapshot upload when the turn has no snapshot
  - returns null URLs when storage upload fails
- `tests/api/chat.test.ts`
  - returns storage URLs on successful fake storage
  - keeps AI replies available when storage upload fails
