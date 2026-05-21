# AGENTS.md

This repository uses AI agents for maintenance. Follow these rules on every change.

## Required Workflow

- Read the relevant code and docs before changing behavior.
- Preserve user changes already present in the working tree.
- Keep edits scoped to the requested behavior.
- Run focused tests first, then broader build/test checks when the change affects shared behavior.
- Report commands run and any checks that were not run.

## Documentation Rule

Every code change must include matching documentation updates before handoff. Check all affected documents:

- `README.md`
- `DEVELOPMENT_PROGRESS.md`
- `Coffee Real-time Ordering System 規格書.md`
- Backend Swagger/JSDoc route comments
- `docs/archive/Coffee Ordering AI Agents 開發參考.md` when historical agent planning context changes
- Local-only guidance such as `CLAUDE.md`, when present

Update docs whenever behavior, API contracts, UI flows, environment variables, deployment steps, tests, or operational assumptions change. If no docs need changes, say so explicitly in the handoff.

## Encoding Rule

Markdown files use UTF-8 with BOM to prevent Traditional Chinese mojibake in Windows tools. Keep `.editorconfig` in sync with this rule.

## Documentation Layout

- Root docs are active handoff material: `README.md`, `AGENTS.md`, `DEVELOPMENT_PROGRESS.md`, and `Coffee Real-time Ordering System 規格書.md`.
- Historical or long-form reference material lives in `docs/archive/`.

## Project Checks

- Backend: run commands from `backend/`.
- Frontend: run commands from `frontend/`.
- Prefer targeted tests for narrow changes, then `npm.cmd run build` for TypeScript/Vue type checks when frontend or backend contracts change.
