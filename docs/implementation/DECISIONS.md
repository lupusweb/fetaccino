# LeadWidget — Architecture Decision Records (ADR)

This document logs critical architectural, security, and design decisions across LeadWidget's lifecycle.

---

## ADR 1: Queue Storage Engine (`chrome.storage.local`)
- **Status:** **Accepted**
- **Decision:** Use `chrome.storage.local` rather than `chrome.storage.sync` or in-memory variables for storing candidate queues, active research sessions, and job statuses.
- **Rationale:** `chrome.storage.sync` imposes strict limits: 8KB per item and 100KB total quota. A list of 50 enriched business leads with URLs and snippets easily exceeds this quota. `chrome.storage.local` provides multi-megabyte capacity and persists across browser and service worker restarts.

---

## ADR 2: Stateless Manifest V3 Service Worker Lifecycle
- **Status:** **Accepted**
- **Decision:** Background orchestration scripts must never maintain critical state in memory variables (e.g. `let queue = []`).
- **Rationale:** Chrome Manifest V3 service workers terminate abruptly after 30 seconds of idle time. Relying on in-memory state leads to silent data loss when users switch tabs or review candidates before exporting. All queue actions read from and commit directly to `chrome.storage.local`.

---

## ADR 3: Strict Separation of DOM Parsers and UI Injection
- **Status:** **Accepted**
- **Decision:** Extraction modules (`src/content/parsers/`) extract raw data objects without generating or manipulating UI nodes. Selection overlays and checkbox rendering are handled independently by `src/content/ui.ts`.
- **Rationale:** Decoupling extraction allows unit testing DOM parsers in pure Node/Vitest environments with static HTML string fixtures, avoiding DOM emulation overhead and making parsers easily portable.

---

## ADR 4: Google Sheets Batch Writing and Duplicate Pre-Filtering
- **Status:** **Accepted**
- **Decision:** Aggregate queued rows and perform a single batch write (`appendMultipleBusinessesToSheet`) rather than invoking individual row append requests in parallel. Query existing sheet rows prior to appending to filter duplicates.
- **Rationale:** Individual row appends trigger Google Sheets API quota limits (60 write requests per minute per user). Batching reduces network overhead to 1-2 API calls per export and eliminates partial write race conditions.

---

## ADR 5: Prioritization of Bulk Google Maps Capture (V1.0)
- **Status:** **Accepted**
- **Decision:** Ship Bulk Google Maps Capture as V1.0 prior to implementing article discovery, automated web scraping, or AI inference.
- **Rationale:** Google Maps represents the highest density of structured commercial leads. Focusing on V1.0 delivers immediate user utility, validates the in-page DOM injection and batch export UX, and keeps initial engineering focused and testable.

---

## ADR 6: Zero-Cost, Local-First Architecture for V1.x and V2.x
- **Status:** **Accepted**
- **Decision:** Rely exclusively on client-side browser execution, `chrome.storage`, and the user's personal Google Drive/Sheets via OAuth 2.0. Avoid introducing paid backend servers, hosted databases, or custom user authentication during initial versions.
- **Rationale:** Eliminates operating overhead, guarantees user privacy, reduces development complexity, and allows users to own their lead data entirely.

---

## ADR 7: Provider-Independent AI Architecture with Groq (V2.0)
- **Status:** **Accepted**
- **Decision:** Design an abstract `AiProvider` interface with Groq as the initial inference adapter. Never bundle shared API keys in extension client code. Users supply their own Groq API keys stored locally in `chrome.storage.local`.
- **Rationale:** Groq provides ultra-fast LPU inference suitable for interactive browser workflows. A provider-agnostic interface avoids vendor lock-in. Client-side key management prevents exposing developer credentials or incurring unsustainable server bills.

---

## ADR 8: The Untrusted Content Rule & Prompt Injection Defense
- **Status:** **Accepted**
- **Decision:** All webpage text, user selections, and external snippets must be treated as untrusted data inputs. Web text is never concatenated directly into LLM system prompts as executable instructions.
- **Rationale:** Malicious or adversarial webpages could embed prompt injection attacks designed to exfiltrate user data, bypass schema validation, or corrupt lead queues. Isolating text inside strict schema delimiters protects system integrity.
