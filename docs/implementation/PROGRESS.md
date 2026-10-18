# LeadWidget — Development Progress Ledger

This ledger tracks the implementation and verification status across all phases and versions of LeadWidget.

**Status Legend:**
- **Implemented and verified:** Code implemented and verified through automated tests or baseline audit.
- **Implemented but unverified:** Code implemented in codebase; pending live manual execution by user.
- **Planned:** Architecture and requirements defined; implementation scheduled for future version.
- **Experimental:** Preliminary exploration, prototyping, or architectural evaluation.
- **Deferred:** Formally postponed to future commercial releases.

---

## 1. Version 1.0 — Bulk Google Maps Capture (Current Target)

### Phase 0 — Repository Audit & Baseline Verification
- **Status:** **Implemented and verified**
- **Summary:** Inspected repository structure, verified baseline single-panel Google Maps extraction, confirmed Manifest V3 configuration, validated existing Vitest test suite.

### Phase 1 — Product & Architecture Documentation Overhaul
- **Status:** **Implemented and verified**
- **Summary:** Updated Product Vision, Full Version Roadmap (V1.0 – V3.0), System Architecture, Data Model, Security & Privacy, V1.0 Plan, Test Plan, Decisions Ledger, and Progress Tracker to align with multi-lead workspace strategy.

### Phase 2 — Architecture Refinement & Queue Foundations
- **Status:** **Implemented and verified**
- **Summary:** Added `QueueItem` domain interface in `business.ts`. Introduced queue-specific message contracts (`ADD_TO_QUEUE`, `REMOVE_FROM_QUEUE`, `CLEAR_QUEUE`, `BATCH_SAVE_QUEUE`) in `messages.ts`. Configured `candidateQueue` storage engine in `storage.ts`. Bound stateless handlers in `src/background/index.ts`.

### Phase 3 — Multi-Card DOM Extraction Engine
- **Status:** **Implemented and verified**
- **Summary:** Upgraded `src/content/parsers/maps.ts` with `parseMapsBulk` targeting `.hfpxzc` card containers. Extracted name, rating, review count, category, and address snippets. Created stable identifier (`_sourceId`) using canonicalized profile URLs. Vitest automated tests in `parser.test.ts` pass completely.

### Phase 4 — In-Page Selection Overlay & State Synchronization
- **Status:** **Implemented but unverified**
- **Summary:** Implemented `src/content/ui.ts` to inject styled, accessible checkboxes onto Google Maps listing cards. Wired selection click handlers to dispatch `ADD_TO_QUEUE` and `REMOVE_FROM_QUEUE`. Synchronized checked status with `candidateQueue` across DOM scrolling and mutation events.
- *Next Action:* Awaiting user manual verification on live Google Maps.

### Phase 5 — Extension Review Queue & Batch Export UI
- **Status:** **Implemented but unverified**
- **Summary:** Overhauled `src/popup/App.tsx`. Replaced single-business form with real-time lead queue view displaying active lead count, field previews, individual delete buttons, and "Clear Queue" action. Implemented batch export button bound to the active `SpreadsheetDestination`.
- *Next Action:* Awaiting user manual verification in live Chrome extension.

### Phase 6 — Duplicate Filtering & Resilient Batch Export
- **Status:** **Implemented but unverified**
- **Summary:** Implemented `appendMultipleBusinessesToSheet` and `filterDuplicates` in `src/services/sheets.ts`. Background service worker pre-checks destination sheet rows, strips duplicates matching phone or name, appends unique leads via Sheets API, and reports saved vs skipped count. Retains failed leads in queue for retry.
- *Next Action:* Awaiting user manual verification against a live Google Sheet.

### Phase 7 — Scopes Hardening & Performance Optimization
- **Status:** **Implemented and verified**
- **Summary:** Debounced `MutationObserver` in `src/content/observer.ts` (150ms). Purged legacy single-lead message types and dead code. Tightened `manifest.json` host permissions strictly to `www.google.com/maps/*`, `www.google.com/search/*`, `sheets.googleapis.com/*`, and `www.googleapis.com/*`.

### Phase 8 — Build & Release Validation
- **Status:** **Implemented (Build & Unit Tests Verified; Pending User Live Verification)**
- **Summary:** Ran Vitest automated test suite (15/15 passing). Ran production Vite build (`npm run build`) producing optimized `dist/` package. Prepared manual testing checklist for final user acceptance.

---

## 2. Future Versions Roadmap Status

| Version | Capability Area | Status | Target Milestone |
| :--- | :--- | :--- | :--- |
| **V1.1** | Resumable Research Queue & Named Sessions | **Planned** | Next Immediate Architecture Milestone |
| **V1.2** | Article and Blog Lead Discovery (Editorial Extraction) | **Planned** | Post-V1.1 |
| **V1.3** | Google Search-Based Business Enrichment & Disambiguation | **Planned** | Post-V1.2 |
| **V1.4** | Business Website Contact & About Page Inspection | **Planned** | Post-V1.3 |
| **V1.5** | Additional Business Source Adapters (Yelp, Directories) | **Planned** | Post-V1.4 |
| **V2.0** | Guardrailed RAG and AI-Assisted Research (Groq Provider) | **Planned / Experimental** | Major Intelligence Release |
| **V2.5** | Lead Organization, Custom Fields & Productivity Presets | **Planned** | Advanced Workflow Release |
| **V3.0** | Commercial Cloud Backend, Team Sync & CRM Connectors | **Deferred** | Commercial Expansion |

---

## 3. Current Actionable Next Step
The codebase for V1.0 Bulk Google Maps Capture is fully built and all automated unit tests pass.  
The current actionable next step is for the user to execute the manual verification checklist documented in `docs/implementation/TEST_PLAN.md` in a live Google Chrome browser session to verify live DOM overlay and Google Sheets OAuth integration.
