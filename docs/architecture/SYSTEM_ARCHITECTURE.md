# LeadWidget — System Architecture

## 1. Architectural Philosophy
LeadWidget enforces clean, modular boundaries while maintaining a lightweight, zero-cost, local-first footprint. We adhere to these governing engineering principles:

1. **Local-First Processing:** Core operations (DOM extraction, queuing, normalizations, and review) occur locally inside the browser. State is persisted in `chrome.storage.local`.
2. **Stateless Service Worker Orchestration:** Chrome Manifest V3 service workers terminate after short periods of inactivity. All orchestration logic must be strictly stateless, persisting active queue state and job progress atomically to local storage.
3. **Decoupled Source Adapters:** Extractors are isolated by source (Google Maps, Google Search, Editorial Articles, Yelp). Changes to a single website's DOM never impact core queue or export modules.
4. **Resilient Batch Export:** Google Sheets operations are batched to avoid API rate limits, pre-filtered against existing sheet data to avoid duplicates, and idempotent to support safe retries.
5. **Guardrailed AI Isolation:** Any AI capabilities (V2.0+) are isolated behind an abstract interface, treated as optional enrichment layers, and strictly guarded against prompt injection.

---

## 2. System Architecture Diagram

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│                              DISCOVERY SURFACE                                │
│                                                                               │
│  ┌─────────────────────────┐  ┌────────────────────────┐  ┌────────────────┐ │
│  │ Google Maps Adapter     │  │ Google Search Adapter  │  │ Editorial /    │ │
│  │ (Multi-Card & Panel)    │  │ (SERP / Local Pack)    │  │ Blog Adapter   │ │
│  │ [Implemented]           │  │ [Parser Implemented]  │  │ [Planned]      │ │
│  └───────────┬─────────────┘  └───────────┬────────────┘  └───────┬────────┘ │
└──────────────┼────────────────────────────┼───────────────────────┼───────────┘
               │ DOM Selection UI           │ Context Ingestion     │ Highlights
               ▼                            ▼                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                        EXTRACTION & NORMALIZATION                             │
│                                                                               │
│  - Field Extractors (Maps, SERP, Schema.org, Meta)                            │
│  - Data Normalizer (Phone E.164, URL hygiene, rating scalar)                  │
│  - Provenance Tagger (Source URL, timestamp, method: DOM vs AI)              │
│  [Implemented and verified for Maps]                                          │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ Raw Candidates
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                   BACKGROUND ORCHESTRATION & STORAGE                          │
│                   (Manifest V3 Service Worker)                                │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                      Research Queue Manager                             │  │
│  │  - Add / Remove / Clear Candidates                                      │  │
│  │  - Job Lifecycle: discovered -> queued -> resolving -> ready            │  │
│  │  - chrome.storage.local (Stateless persistence & session binding)       │  │
│  │  [V1.0 Queue Implemented; V1.1 Resumable Sessions Planned]              │  │
│  └───────────────┬─────────────────────────────────────────┬───────────────┘  │
│                  │                                         │                  │
│                  ▼                                         ▼                  │
│  ┌───────────────────────────────┐       ┌─────────────────────────────────┐  │
│  │ Enrichment & Identity Engine  │       │  AI Inference Interface         │  │
│  │ - Google Search resolver      │       │  - Provider-independent contract│  │
│  │ - Bounded website inspector   │       │  - Initial: GroqAiAdapter       │  │
│  │ - Duplicate & fuzzy matcher   │       │  - Strict schema validation     │  │
│  │ [Planned: V1.3 – V1.4]        │       │  [Planned / Experimental: V2.0] │  │
│  └───────────────────────────────┘       └─────────────────────────────────┘  │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ Validated Leads
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                             USER INTERFACES                                   │
│                                                                               │
│  ┌─────────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │ Extension Popup Workspace           │  │ Options & Configuration        │  │
│  │ - Queue review list & count         │  │ - Google OAuth token flow      │  │
│  │ - Remove / Clear controls           │  │ - Destination spreadsheet      │  │
│  │ - Destination banner & Batch Save   │  │   selector (Drive API search)  │  │
│  │ [Implemented but unverified live]   │  │ [Implemented and verified]     │  │
│  └──────────────────┬──────────────────┘  └────────────────────────────────┘  │
└─────────────────────┼─────────────────────────────────────────────────────────┘
                      │ Batch Save Command
                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL EXPORT SERVICES                             │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Google Sheets Service (src/services/sheets.ts)                          │  │
│  │ - OAuth 2.0 via chrome.identity                                         │  │
│  │ - Pre-export duplicate check against existing sheet rows               │  │
│  │ - Batch append (`appendMultipleBusinessesToSheet`)                      │  │
│  │ - Error isolation & partial failure recovery                            │  │
│  │ [Implemented but unverified live]                                       │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Modular Architecture Breakdown

### 3.1 Content Script & Discovery Adapters (`src/content/`)
- **`observer.ts`:** Debounced `MutationObserver` listening for dynamic DOM updates on supported hosts without causing performance degradation. *(Implemented and verified)*
- **`parsers/maps.ts`:** Extracts single-panel and multi-card (`.hfpxzc`) listings, generating stable IDs (`_sourceId`) from profile URLs. *(Implemented and verified)*
- **`parsers/search.ts`:** Parses Google Search Knowledge Panels and Local Pack business listings. *(Implemented but unverified)*
- **`parsers/normalizer.ts`:** Cleans raw DOM strings into standardized data types (integers, floats, trimmed strings, URL normalizations). *(Implemented and verified)*
- **`ui.ts`:** Injects subtle, non-intrusive checkboxes onto Google Maps listing cards. Dispatches selection messages to the background worker. *(Implemented but unverified live)*
- **Future Evolution (V1.2 – V1.5):** Refactor into a standardized `SourceAdapter` pattern (`adapters/maps.ts`, `adapters/search.ts`, `adapters/editorial.ts`, `adapters/yelp.ts`).

### 3.2 Service Worker Orchestration (`src/background/`)
- **`index.ts`:** The primary message bus. Listens for messages from Content Scripts, Popup, and Options.
- **Queue State Machine:** Manages the `candidateQueue` stored in `chrome.storage.local`. Every action (`ADD_TO_QUEUE`, `REMOVE_FROM_QUEUE`, `CLEAR_QUEUE`, `BATCH_SAVE_QUEUE`) persists immediately.
- **`auth.ts`:** Wraps `chrome.identity.getAuthToken`, handling interactive sign-in and silent token refresh. *(Implemented and verified)*
- **Future Evolution (V1.1+):** Formalize a `QueueManager` and `JobScheduler` handling resumable research jobs and named research sessions.

### 3.3 Domain Data Models (`src/domain/`)
- **`business.ts`:** Core interfaces for `BusinessData` and `QueueItem`.
- **`destination.ts`:** Interface for `SpreadsheetDestination`.
- **`messages.ts`:** Strongly-typed message contracts and payload definitions.
- **Future Evolution (V1.1+):** Expand to support `Candidate`, `ResearchSession`, `FieldProvenance`, and `AiInferenceRequest`.

### 3.4 Services Layer (`src/services/`)
- **`sheets.ts`:** Encapsulates all Google Sheets API v4 calls. Performs metadata fetching, sheet search (via Drive API), duplicate pre-checks, and batch appending. *(Implemented)*
- **`storage.ts`:** Type-safe wrapper over `chrome.storage.local` and `chrome.storage.sync`. *(Implemented)*
- **`logger.ts`:** Structured logging utility for debugging across contexts. *(Implemented and verified)*
- **Future Evolution (V1.3 – V2.0):** Add `EnrichmentService` (Search & Web) and `AiService` (Groq adapter).

### 3.5 User Presentation Layer (`src/popup/` & `src/options/`)
- **`src/popup/App.tsx`:** Primary review screen. Shows the active destination, real-time list of queued leads with missing field indicators, and the batch export button. *(Implemented)*
- **`src/popup/DestinationSelector.tsx`:** Modal/dropdown allowing users to search and select target Google Spreadsheets and worksheets. *(Implemented)*
- **`src/options/Options.tsx`:** Full-tab configuration screen for OAuth authentication and setting default destinations. *(Implemented)*

---

## 4. Planned Evolution: Provider-Independent AI Architecture (V2.0)

When AI capabilities are introduced in V2.0, the extension will integrate a provider-independent AI interface with Groq as the initial inference adapter:

```typescript
// Architectural specification for V2.0 AI layer
export interface AiInferenceRequest {
  task: 'extract_mentions' | 'classify_relevance' | 'reconcile_conflict';
  untrustedInputText: string;
  contextMetadata: {
    sourceUrl: string;
    pageTitle?: string;
  };
  expectedSchema: object; // Strict JSON schema definition
}

export interface AiInferenceResponse<T = any> {
  success: boolean;
  data?: T;
  rawExplanation?: string;
  error?: string;
  tokenUsage?: { prompt: number; completion: number };
}

export interface AiProvider {
  id: string;
  name: string;
  isConfigured(): Promise<boolean>;
  infer<T>(request: AiInferenceRequest): Promise<AiInferenceResponse<T>>;
}
```

### Groq Adapter Guardrails (`GroqAiAdapter`)
1. **Prompt Sandboxing:** Page text is never inserted into raw prompt templates as instructions. It is passed strictly within structured data delimiters (e.g., `<untrusted_web_data>...</untrusted_web_data>`) with system prompts enforcing schema-only extraction.
2. **Deterministic Output Validation:** Every response from Groq must be parsed as JSON and validated against a schema (e.g., Zod) before being admitted to the candidate queue.
3. **No Embedded API Keys:** The extension never includes a pre-packaged Groq API key. Keys are supplied by the user in options and stored in `chrome.storage.local`.
4. **Resilience & Fallback:** Rate limits (HTTP 429), timeouts, and parse failures gracefully fall back to manual review without crashing the application.

---

## 5. Architectural Component Status Matrix

| Component / Subsystem | Path / Module | Current Status | Notes |
| :--- | :--- | :--- | :--- |
| Maps Single-Panel Extractor | `src/content/parsers/maps.ts` | **Implemented and verified** | Baseline verified; tests pass. |
| Maps Bulk Card Extractor | `src/content/parsers/maps.ts` | **Implemented and verified** | `parseMapsBulk` tested via Vitest. |
| Google Search SERP Extractor | `src/content/parsers/search.ts` | **Implemented but unverified** | Parser unit tested; UI hook deferred to V1.3. |
| Data Normalizer | `src/content/parsers/normalizer.ts` | **Implemented and verified** | Cleans phone, rating, reviews. |
| Maps Selection Overlay UI | `src/content/ui.ts` | **Implemented but unverified** | Code complete; pending live manual test. |
| Content Observer & Debounce | `src/content/observer.ts` | **Implemented and verified** | Dynamic DOM monitoring. |
| Background Service Worker Bus | `src/background/index.ts` | **Implemented and verified** | Central router for messages. |
| Local Storage Queue Engine | `src/services/storage.ts` | **Implemented and verified** | `chrome.storage.local` persistence. |
| Google OAuth & Identity | `src/background/auth.ts` | **Implemented and verified** | Wraps `chrome.identity`. |
| Google Sheets Batch Exporter | `src/services/sheets.ts` | **Implemented but unverified** | Batch writing & duplicate check written. |
| Popup Queue Review UI | `src/popup/App.tsx` | **Implemented but unverified** | React queue review screen built. |
| Destination Selector UI | `src/popup/DestinationSelector.tsx` | **Implemented and verified** | Drive API spreadsheet picker verified. |
| Persistent Research Sessions | `src/domain/session.ts` | **Planned (V1.1)** | Multi-session workspace management. |
| Article Discovery Engine | `src/content/adapters/editorial.ts` | **Planned (V1.2)** | Unstructured content mention parsing. |
| Search-Based Enrichment Worker | `src/background/enrichment/search.ts` | **Planned (V1.3)** | Automated gap-filling via Search. |
| Bounded Website Inspector | `src/background/enrichment/website.ts` | **Planned (V1.4)** | Contact & About page DOM scraper. |
| Directory Adapters (Yelp) | `src/content/adapters/yelp.ts` | **Planned (V1.5)** | Standardized third-party directory adapter. |
| Groq AI RAG Layer | `src/services/ai/` | **Planned / Experimental (V2.0)** | Guardrailed LLM inference. |
| Commercial Cloud Sync & CRM | Cloud Backend | **Deferred (V3.0)** | Multi-user sync & team workspaces. |
