# LeadWidget — Product Vision

## 1. Executive Summary & Vision
LeadWidget (internally developed under the prototype name *Fetaccino*) is evolving from a single-business Chrome extension into a **context-aware, bulk lead acquisition and research workspace**.

The ultimate goal is to empower users to discover, evaluate, and acquire high-quality business leads seamlessly across their natural web browsing workflows—without manual copying, tedious profile-by-profile clicking, or costly software subscriptions.

## 2. Core Workflow Loop
The end-to-end workflow follows a disciplined, seven-stage pipeline:

```text
[1. Discover Businesses]
          │  (Google Maps, Google Search, Articles, Blogs, Directories)
          ▼
[2. Collect Candidates in Bulk]
          │  (DOM selection affordances, context menus, highlight-to-queue)
          ▼
[3. Research & Enrich]
          │  (Targeted Search lookups, bounded Website inspection, Contact/About scrapers)
          ▼
[4. Resolve Business Identity]
          │  (Deterministic matching, entity reconciliation, human-in-the-loop review)
          ▼
[5. Validate Evidence & Uncertainty]
          │  (Source provenance tracking, field-level confidence, transparency)
          ▼
[6. Review & Organize Leads]
          │  (Popup workspace, session queue, duplicate resolution, manual overrides)
          ▼
[7. Export to Destination]
          │  (Google Sheets API batch export with session-bound destinations)
          ▼
     [Target Sheet]
```

Users discover business mentions on Google Maps, Google Search, editorial articles, industry blogs, and business websites without manually opening and capturing each business one-by-one.

## 3. Core Architectural & Product Priorities

1. **Local-First Processing Where Practical:**
   - Candidate queues, active research jobs, and session state reside in the user's browser (`chrome.storage.local`).
   - Network calls to external APIs are strictly limited to necessary data retrieval and export.

2. **Zero Paid Backend Infrastructure (Initial Development):**
   - No proprietary cloud databases, backend worker clusters, or monthly server costs during V1.x and V2.x.
   - Storage is user-owned: authentication and destination spreadsheets leverage the user's personal Google Drive/Sheets account via OAuth 2.0.

3. **Reliable Bulk Collection & Resumable Processing:**
   - Background tasks operate statelessly over the Manifest V3 Service Worker lifecycle.
   - Long-running enrichment tasks persist incremental state to local storage so worker termination or network interruptions do not cause job loss.

4. **Evidence-Backed Lead Data & Transparent Uncertainty:**
   - Every extracted data point retains source evidence (origin URL, context snippet, extraction timestamp, method).
   - Clear distinction between verified information, inferred information, and missing fields.
   - Ambiguous matches and low-confidence data are routed to human review rather than silently fabricated or merged.

5. **Strict Security, Privacy, and Source-Compliance Guardrails:**
   - Chrome permissions remain minimally scoped.
   - Scraping is strictly bounded (no unbounded recursive web crawlers).
   - Page text is treated strictly as untrusted input data.
   - Zero shared API secrets in extension packages.

6. **Modular Architecture for Commercial Expansion:**
   - Clean boundaries between Source Adapters, Queue Orchestration, Identity Resolution, AI Reasoning, and Exporters allow transitioning to cloud sync and team workspaces (V3.0) without rewriting core logic.

## 4. Conceptual Data Stages & Terminology
To maintain rigor across code and documentation, LeadWidget strictly defines the lifecycle stages of a lead:

| Stage | Definition | Current Status |
| :--- | :--- | :--- |
| **Candidate** | An unverified business mention or card observed on a webpage (e.g., Maps result, article text). Contains preliminary name and source URL. | Implemented for Maps (Unverified Live) |
| **Queued Candidate** | A candidate explicitly or automatically staged in the local research queue pending enrichment or review. | Implemented for Maps (Unverified Live) |
| **Enriched Candidate** | A candidate augmented with additional data (phone, address, website, email) via Search or Website inspection. | Planned (V1.3 – V1.4) |
| **Resolved Identity** | A candidate whose identity (name + address / website / domain) has been verified or disambiguated against existing records. | Planned (V1.1 – V1.3) |
| **Ambiguous / Duplicate** | A candidate that matches existing records or has conflicting identity data requiring human intervention. | Implemented (Basic Duplicate Check); Planned (Fuzzy Resolution) |
| **Lead (Ready for Export)** | A validated, reviewed business record formatted with full field schema ready to be committed. | Implemented (Unverified Live) |
| **Exported Record** | A lead committed to the target Google Sheet, with export timestamp and destination metadata logged. | Implemented (Unverified Live) |

## 5. Implementation Status Overview

| Capability Area | Implemented Status | Planned Version | Notes |
| :--- | :--- | :--- | :--- |
| Single Google Maps Extraction | **Implemented and verified** | Baseline / V1.0 | Baseline panel parser passes unit tests. |
| Bulk Google Maps Extraction | **Implemented and verified** | V1.0 | `parseMapsBulk` extracts multiple cards; Vitest unit tests passing. |
| Google Maps Injected Checkboxes | **Implemented but unverified** | V1.0 | Overlay injection (`ui.ts`) implemented; pending live browser test checklist. |
| Multi-Lead Popup Review Queue | **Implemented but unverified** | V1.0 | Real-time queue view in React popup; pending live manual test. |
| Google Sheets Batch Export | **Implemented but unverified** | V1.0 | Batch appending with duplicate pre-filtering; pending live manual test. |
| Search SERP Parsing | **Implemented but unverified** | V1.0 (Parser) / V1.3 (UI) | Parser exists in `search.ts`; contextual injection deferred. |
| Persistent Research Queue & Sessions | **Planned** | V1.1 | Resumable background job management across tabs & navigation. |
| Article & Editorial Mention Discovery | **Planned** | V1.2 | Contextual selection and article heuristic extraction. |
| Google Search Enrichment | **Planned** | V1.3 | Automated secondary search lookups for queued candidate gaps. |
| Business Website Enrichment | **Planned** | V1.4 | Bounded Contact/About page DOM inspection and JSON-LD parsing. |
| Additional Directory Adapters (Yelp) | **Planned** | V1.5 | Modular source adapters for third-party directories. |
| Guardrailed AI / Groq RAG Assistance | **Planned / Experimental** | V2.0 | Optional LLM extraction and disambiguation using Groq. |
| Custom Fields & Workflow Templates | **Planned** | V2.5 | Power-user organization and export configuration. |
| Cloud Workspaces & Commercial Backend | **Deferred** | V3.0 | Multi-user sync, CRM connectors, managed subscriptions. |
