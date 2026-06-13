# PR4 conversation loop handoff

## Why this note exists

During the PR4 review, the conversation loop looked complete at first because
`/api/chat` received a `snapshot` field. The gap was subtler: the page was using
the most recently stored snapshot instead of capturing the current camera frame
after ASR completed.

That breaks the documented P0 order:

```text
voice -> ASR userText -> fresh camera snapshot -> POST /api/chat -> structured UI
```

If a user starts the camera and speaks twice, the second turn must not silently
reuse an old manual snapshot. It must either capture a fresh frame for that turn
or send `snapshot: null` and let the visual fallback reason explain the missing
visual signal.

## PR4 behavior to preserve

- `Home` owns the conversation turn list.
- Each ASR transcript creates one turn with:
  - `sessionId`
  - `turnId`
  - `userText`
  - the snapshot payload captured for that turn, or `null`
  - submit status
  - structured chat response
  - failure reason when chat submission fails
- `CameraPreview` exposes `captureSnapshot()` through a ref.
- `Home.submitChat()` calls `captureSnapshot()` immediately before posting to
  `/api/chat`.
- If the camera is not ready, `captureSnapshot()` returns `null`; the app should
  continue with voice-only fallback rather than inventing a visual scene.
- The next chat request includes a lightweight `historySummary` from recent
  completed turns.

## Regression coverage

Keep these tests when changing the PR4 flow:

- `tests/unit/home-chat-flow.test.tsx`
  - submits ASR text to `/api/chat`
  - captures a fresh camera snapshot before chat submission
  - keeps consecutive turns visible and sends history into the next request
- `tests/unit/visual-evidence.test.tsx`
  - usable visual evidence
  - unusable visual fallback reason
  - low-confidence visual observation
- `tests/unit/music-suggestion-card.test.tsx`
  - populated music direction fields
  - missing optional fields do not hide populated fields

## PR5 implications

PR5 should build storage from the turn boundary above.

Do:

- persist the same per-turn snapshot that was submitted to `/api/chat`
- persist the validated chat response as turn JSON
- merge completed turns into session JSON
- keep fake storage available for local and CI runs
- make Qiniu upload failures non-blocking for the AI reply

Do not:

- recapture a second snapshot in the storage layer
- rely on a stale global `latestSnapshot`
- expose Qiniu access keys to the browser bundle
- make storage success a prerequisite for rendering `replyText`

## PR5 readiness checklist

Before starting PR5 code, confirm:

- PR4 branch has a clean worktree.
- `/api/chat` receives the fresh per-turn snapshot or `null`.
- `ChatResponse.qiniu` is already optional in the contract and can be populated
  by PR5 without breaking PR4 UI.
- Storage paths follow the original plan:
  - `snapshots/{sessionId}/{turnId}.webp`
  - `turns/{sessionId}/{turnId}.json`
  - `sessions/{sessionId}.json`
  - `audio/{sessionId}/{assetId}.mp3`
