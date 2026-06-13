# Riff

Riff is an AI visual conversation assistant for music creation. It observes a creator's camera scene, listens to spoken intent, and turns visual context plus voice input into concrete music direction.

## Current Scope

This repository is being prepared for application implementation. Detailed product, architecture, operations, and competition planning notes are kept locally and are intentionally not published in the repository.

Core demo flow:

1. Capture microphone input and transcribe speech to text.
2. Capture one compressed camera snapshot for each conversation turn.
3. Send `userText + snapshot + motionSignal` to `/api/chat`.
4. Return structured AI output with visual evidence and music suggestions.
5. Store key conversation artifacts in cloud storage.
6. Generate optional TTS and reference audio with graceful fallbacks.

## Public Repository Policy

Local planning documents, competition notes, credentials, environment files, generated media, and demo artifacts should not be committed. Keep implementation-facing documentation public only when it is reviewed for release.
