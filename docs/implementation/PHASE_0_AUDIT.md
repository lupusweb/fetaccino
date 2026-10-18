# Phase 0 Audit & Technical Baseline

## Overview
This document records the baseline state of the Fetaccino (formerly LeadWidget) repository before initiating the V1.0 Bulk Maps Capture implementation.

## 1. Verified Architecture & File Structure
- **Frameworks:** Manifest V3, React 18, TypeScript, Vite.
- **`manifest.json`:** Valid V3 configuration. `host_permissions` include `*://*.google.com/*`, `sheets.googleapis.com`, and `www.googleapis.com`. `oauth2.scopes` includes `spreadsheets` and `drive.readonly`.
- **`src/content/`:** Contains `index.ts` (entry point), `detector.ts`, `observer.ts`, and `parsers/`. The existing logic detects single business contexts (like Maps side panels) and extracts data.
- **`src/popup/`:** Contains the React app (`App.tsx`, `DestinationSelector.tsx`). Presents the parsed data to the user to review, edit, check for duplicates, and save to a spreadsheet.
- **`src/options/`:** Basic settings UI (`Options.tsx`) allowing the user to connect their Google Account and choose a Destination Spreadsheet.
- **`src/services/`:** `sheets.ts` handles the Sheets API logic (getting details, searching via Drive API, writing rows, checking duplicates). `auth.ts` wraps `chrome.identity`. `storage.ts` manages local and sync storage.
- **`src/background/`:** Service worker `index.ts` listens for messages (`DETECT_PAGE_CONTEXT`, `GET_CURRENT_BUSINESS`, `ADD_BUSINESS`, `SEARCH_SPREADSHEETS`, etc.) and orchestrates operations using the services.
- **`src/domain/`:** Type definitions for `BusinessData`, `SpreadsheetDestination`, and `MessageType`.

## 2. Existing Capabilities
- Automatically detects if the user is on a Google Maps business panel.
- Parses Name, Category, Rating, Reviews, Address, Phone, Website.
- Integrates cleanly with a chosen Google Spreadsheet without requiring manual Sheet IDs from the user.
- Saves directly to the user's Sheet.
- Warns against duplicates on save.

## 3. Automated Tests
- Tests are written using Vitest (`src/services/logger.test.ts`, `src/content/detector.test.ts`, `src/content/parsers/parser.test.ts`).
- Currently, **14/14 tests pass** successfully.
- `npm run build` succeeds cleanly in under 1 second.

## 4. Gaps and V1.0 Requirements
- Currently, it only extracts a *single* open business panel. It does not extract multiple business cards from the main search results scroll view.
- There is no injection of UI elements ("LeadWidget selection affordances") into the page.
- There is no persistent "Research Queue" or selected count in the popup to handle multiple businesses at once.
- DOM processing must be updated to target `.hfpxzc` / result cards rather than just the active side panel.

## 5. Risks
- Google Maps frequently A/B tests and changes class names. Selectors must be robust or easily configurable.
- Injecting selection UI into Maps requires careful CSS scoping to prevent breaking native layouts.
- Storing multiple leads and maintaining stable identifiers requires generating an ID from the map link or name+address, as position in the DOM is unstable.

## 6. Proposed Path Forward
- We will proceed to implement the V1.0 Plan by upgrading the parsers to capture bulk cards, injecting a selection UI, and upgrading the popup to a list/queue review screen before batch saving.
