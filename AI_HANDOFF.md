# LeadWidget — AI Engineering Handoff

## 1. Current State of the Project
LeadWidget (internally codenamed *Fetaccino* during initial prototype sprints) is a local-first, zero-infrastructure Chrome Extension for bulk lead acquisition and research.

The codebase implements **V1.0 — Bulk Google Maps Capture**:
- **Multi-Card Extraction:** `src/content/parsers/maps.ts` (`parseMapsBulk`) extracts visible `.hfpxzc` cards from Google Maps.
- **Selection Overlay:** `src/content/ui.ts` dynamically injects checkboxes into Google Maps listing cards.
- **Queue Review & Batch Export:** `src/popup/App.tsx` enables review of queued leads and initiates atomic batch writes to Google Sheets via `src/services/sheets.ts`.
- **Duplicate Prevention:** Destination sheet is queried prior to saving to filter out existing business names or phone numbers.
- **Testing & Build:** Vitest automated tests (`15/15`) passing. Production build compiles cleanly via `npm run build` into `dist/`.

## 2. Definitive Documentation Index
All product, roadmap, and architectural documentation has been structured in `docs/`:
- [Product Vision](file:///d:/Coding/leadwidget/docs/PRODUCT_VISION.md)
- [Version Roadmap (V1.0 - V3.0)](file:///d:/Coding/leadwidget/docs/ROADMAP.md)
- [System Architecture](file:///d:/Coding/leadwidget/docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Data Model](file:///d:/Coding/leadwidget/docs/architecture/DATA_MODEL.md)
- [Security & Privacy](file:///d:/Coding/leadwidget/docs/architecture/SECURITY_AND_PRIVACY.md)
- [Message Contracts](file:///d:/Coding/leadwidget/docs/architecture/MESSAGE_CONTRACTS.md)
- [V1.0 Plan](file:///d:/Coding/leadwidget/docs/implementation/V1.0_PLAN.md)
- [Test Plan & Manual Checklist](file:///d:/Coding/leadwidget/docs/implementation/TEST_PLAN.md)
- [Architecture Decisions](file:///d:/Coding/leadwidget/docs/implementation/DECISIONS.md)
- [Progress Ledger](file:///d:/Coding/leadwidget/docs/implementation/PROGRESS.md)

## 3. Next Actionable Milestone
- **User Live Testing:** Execute the manual validation checklist in [docs/implementation/TEST_PLAN.md](file:///d:/Coding/leadwidget/docs/implementation/TEST_PLAN.md) to verify live Google Maps DOM interaction and Google Sheets writes.
- **V1.1 Implementation:** Begin implementing persistent, resumable research sessions and destination management.
