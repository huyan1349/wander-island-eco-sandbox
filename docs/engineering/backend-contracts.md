# Backend Contracts And Hardening Plan

## Current Backend Scope

The Express server owns auth, islands, friends, chat, mailbox, visitors, bottles, gifts, board, admin, user state, Socket.IO presence, and AI narration.

## Hardening Steps

1. Add request body schemas for every mutating route.
2. Return a consistent error shape: `{ error: { code, message } }`.
3. Standardize auth middleware and document public routes.
4. Tighten production CORS to configured origins.
5. Add upload limits and MIME checks for avatars/files.
6. Add Socket.IO payload validation and user authorization.
7. Add AI request timeout, rate limit, and local fallback metrics.
8. Add database migrations before schema changes.
9. Add integration tests for auth, island save/load, friends, gifts, and mailbox.

## Non-Negotiables

- AI failure must not block core gameplay.
- Invalid requests must not crash the server.
- Private user data must require auth.
- Admin routes must stay isolated.
