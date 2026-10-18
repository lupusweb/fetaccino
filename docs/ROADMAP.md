# LeadWidget — Full Version Roadmap

This roadmap serves as the authoritative architectural and planning schedule for LeadWidget (prototype codename *Fetaccino*). Every version defines an explicit purpose, feature scope, architectural boundaries, exclusions, and verification criteria.

Features are tagged with their precise engineering status:
- **Implemented and verified:** Code written and verified by automated tests or baseline audit.
- **Implemented but unverified:** Code written but awaiting live human end-to-end execution.
- **Planned:** Formally specified for subsequent phases; implementation not yet started.
- **Experimental:** Architecture or feature under preliminary design / evaluation.
- **Deferred:** Intentionally postponed to future commercial releases.

---

## Strategic Priority Rationale: Why Bulk Google Maps Capture (V1.0) First?
The decision to prioritize Bulk Google Maps Capture as V1.0 before implementing broader article discovery or AI enrichment rests on three foundational engineering and product realities:
1. **Immediate High-Density Value:** Google Maps is the primary, highest-density source of structured local business data globally. Delivering multi-lead capture here provides instant, standalone utility for users without requiring complex multi-step research pipelines.
2. **Foundational DOM and Batch UX:** Establishing the in-page DOM injection overlay, selection synchronizer, popup queue management, and Google Sheets batch export mechanics creates the core infrastructure that all subsequent versions (V1.1 – V3.0) rely on.
3. **Zero-Backend Stability:** V1.0 operates completely local-first with zero API overhead or external costs, allowing us to validate core extension mechanics and Chrome Web Store compliance before introducing asynchronous web scraping or third-party inference.

---

## Version 1.0 — Bulk Google Maps Capture
**Current Implementation Baseline (Immediate Target)**  
**Status:** **Implemented (Automated Tests Verified; Pending User Live Verification)**

### Purpose
Establish a fast, reliable multi-lead collection and export workflow for Google Maps search results, eliminating the need to click and open business cards individually.

### Scope & Key Capabilities
- **Multi-Card DOM Parser:** Identify visible business result cards (`.hfpxzc` listings) in Google Maps search results and extract available summary fields (Name, Rating, Reviews, Category, Address snippet). (*Implemented and verified via unit tests*)
- **In-Page Selection Overlay:** Dynamically inject subtle, accessible selection checkboxes onto visible business cards without disrupting Google Maps layouts. (*Implemented but unverified live*)
- **Individual and Bulk Selection:** Support selecting/deselecting individual cards and a "Select All Visible" action. (*Implemented but unverified live*)
- **DOM Mutation & Scroll Persistence:** Retain selected card states across Google Maps virtualized list scrolling and DOM mutations using stable identifiers (`_sourceId`). (*Implemented but unverified live*)
- **Extension Queue Review:** Render selected leads in a dedicated, scrollable review panel within the extension popup. (*Implemented but unverified live*)
- **Google Sheets Batch Export:** Commit queued leads directly to the user's connected Google Sheet in an atomic or sequential batch via Google Sheets API v4. (*Implemented but unverified live*)
- **Duplicate & Error Resilience:** Check the destination sheet before saving to identify duplicate names/phones, skip duplicates, and retain failed records in the queue for retry. (*Implemented but unverified live*)
- **Preserve Single-Business Capture:** Maintain baseline ability to parse an individual open business panel. (*Implemented and verified*)

### Explicit Exclusions
- Unrestricted web crawling or background website inspection.
- Article or blog text extraction.
- External AI inference or LLM processing.
- Multi-session queue persistence across different browsers/devices.
- Additional directory integrations (Yelp, YellowPages).

### Acceptance Criteria
- [x] Automated test suite (`vitest`) passes with 100% coverage on parsers, normalizers, and queue contracts.
- [x] Extension builds cleanly into production `dist/` bundle via `npm run build`.
- [ ] User completes manual verification checklist on live Google Maps (20+ business results, select/deselect, scroll retention, duplicate filtering, successful Sheets append).

---

## Version 1.1 — Research Queue and Destination Management
**Status:** **Planned**

### Purpose
Transform the extension from an ephemeral per-tab selector into a resilient, persistent research workspace with flexible destination routing.

### Scope & Key Capabilities
- **Persistent, Resumable Queue:** Decouple candidate storage from tab lifecycles. If the browser closes or the Service Worker restarts, queued candidates remain intact with exact progress state in `chrome.storage.local`.
- **Separation of Lifecycle States:** Formally distinguish between *Candidate Discovery*, *Enrichment Status*, *Resolved Identity*, and *Exported Records*.
- **Named Research Sessions:** Allow users to create and manage distinct research sessions (e.g., "Austin Plumbers - Campaign A", "Denver HVAC").
- **Contextual Destination Association:** Bind research sessions to specific target spreadsheets and worksheets. Avoid repeatedly prompting the user to select or re-select destinations during routine browsing.
- **Cross-Source Deduplication:** Detect and flag candidate duplicates across disparate pages or research sessions.
- **Interrupted Job Recovery:** Gracefully resume incomplete queue operations following network disconnections or tab navigation.

### Explicit Exclusions
- Automated third-party web scraping outside of user-visited tabs.
- Cloud-hosted database synchronization (remains strictly local-first).

---

## Version 1.2 — Article and Blog Lead Discovery
**Status:** **Planned**

### Purpose
Enable seamless business candidate discovery from unstructured editorial content, industry blog posts, local directories, and "Top 10" listicles.

### Scope & Key Capabilities
- **Deterministic Editorial Extraction:** Parse common editorial patterns (numbered lists, heading tags, schema.org `ItemList`, bolded entities) to detect business mentions.
- **Highlight-to-Queue Contextual Actions:** Allow users to highlight business names on any webpage and right-click or click an inline hover icon to stage them directly into the active research session.
- **Multi-Candidate Batch Ingestion:** Support capturing multiple business names from a single reading session without page navigation.
- **Provenance & Evidence Preservation:** Capture and store the source webpage URL, publication title, and surrounding contextual paragraph/snippet alongside each candidate.
- **Research Queue Ingestion:** Feed editorial candidates directly into the V1.1 Research Queue for subsequent validation and enrichment.

### Explicit Exclusions
- Mandatory AI dependency for basic listicle extraction (must utilize deterministic DOM parsing first).
- Automated crawling of outbound links from articles without user approval.

---

## Version 1.3 — Google Search-Based Business Enrichment
**Status:** **Planned**

### Purpose
Automatically enrich incomplete candidates collected from articles, blogs, or partial listings by conducting targeted Google Search lookups.

### Scope & Key Capabilities
- **Targeted Search Queries:** Construct targeted Google Search queries for queued candidates missing phone numbers, websites, or physical addresses (e.g., `"[Business Name]" [Location] contact phone`).
- **Knowledge Panel & SERP Parsing:** Reuse and expand `search.ts` parsers to extract verified Knowledge Graph, Local Pack, and snippet data.
- **Identity Evidence Comparison:** Compare name variations, location proximity, and website domains to verify match confidence.
- **Human-in-the-Loop Review for Ambiguity:** Flag conflicting or uncertain matches in the review queue rather than silently merging false positives.
- **Concurrency & Rate-Limiting Control:** Implement exponential backoff, request pacing, and user-controlled concurrency to prevent search rate-limiting.
- **Local Search Cache:** Cache query results locally to prevent duplicate search requests for identical candidates.

### Explicit Exclusions
- Headless automated botting or CAPTCHA bypassing.
- Unmonitored bulk background searching.

---

## Version 1.4 — Business Website Enrichment
**Status:** **Planned**

### Purpose
Inspect confirmed official business websites to extract authoritative contact details, email addresses, social profiles, and operational hours.

### Scope & Key Capabilities
- **Targeted Page Discovery:** Bounded inspection limited to relevant subpages (Home, Contact Us, About Us, Locations) rather than full-site spidering.
- **Structured Data Extraction:** Parse JSON-LD (`LocalBusiness`, `Organization`), Open Graph tags, and microdata.
- **Footer & Header Heuristics:** Extract phone numbers, contact emails (mailto), physical addresses, and social links from common layout patterns.
- **Strict Bounded Limits:** Enforce maximum depth (1 hop) and page limits (maximum 3-5 pages per business domain) to ensure performance and respect bandwidth.
- **Field-Level Provenance:** Explicitly tag each enriched field with its source subpage URL and timestamp; distinguish verified website data from third-party directory data.

### Explicit Exclusions
- Unbounded recursive web crawling.
- Scraping login-protected or robots.txt-disallowed areas.

---

## Version 1.5 — Additional Business Source Integrations
**Status:** **Planned**

### Purpose
Broaden discovery capabilities to additional business directories (e.g., Yelp, YellowPages, industry-specific directories) through modular, independent adapters.

### Scope & Key Capabilities
- **Independent Source Adapters:** Standardized `SourceAdapter` interface decoupling page-specific selectors from core queue, normalization, and export services.
- **Feasibility & Compliance Assessment:** Explicitly evaluate terms of service, robots policies, public APIs, and technical feasibility for each directory before implementation.
- **Directory-Specific Normalization:** Normalize directory-specific categories, ratings scales, and contact layouts into the shared `BusinessData` domain model.
- **Unified Review Workflow:** Ingest leads from any supported directory into the same active research session and Google Sheet destination.

### Explicit Exclusions
- Circumventing anti-scraping protections or violating platform terms of service.
- Universal "scrape any website" promises.

---

## Version 2.0 — Guardrailed RAG and AI-Assisted Lead Research
**Status:** **Planned / Experimental**  
**Initial AI Inference Provider:** **Groq** (Fast LPU inference, OpenAI-compatible API)

### Purpose
Introduce an optional, strictly guardrailed AI layer to extract business mentions from complex unstructured editorial text and reconcile ambiguous entity conflicts where deterministic code fails.

### Scope & Key Capabilities
- **Provider-Independent AI Interface:** Define a generic `AiProvider` interface with an initial `GroqAiAdapter`, ensuring future flexibility (OpenAI, Anthropic, local WebLLM) without core refactoring.
- **Page Relevance & Intent Classification:** Quickly classify whether a browsed article contains extractable commercial business recommendations.
- **Complex Editorial Mention Extraction:** Extract structured business entities from conversational, messy, or non-standard listicle formats using structured JSON outputs.
- **Context-Aware Retrieval:** Extract supporting textual passages surrounding business mentions and present them as human-verifiable evidence.
- **Evidence-Based Reconciliation:** Compare conflicting phone numbers, addresses, or websites across sources and produce evidence-backed recommendations.
- **Untrusted Content Defense:** Treat all extracted webpage text as untrusted data inputs. Use strict prompt sandboxing to completely prevent prompt injection attacks.
- **Deterministic Schema Validation:** Validate all LLM responses against strict JSON schemas before data enters the queue; discard malformed outputs.
- **Zero-Shared-Secrets Security:** Never bundle a shared API key into distributed extension code. Support user-provided Groq API keys stored locally in `chrome.storage.local`.
- **AI Transmission Transparency:** Provide explicit UI disclosures informing the user whenever webpage text is being transmitted to Groq.

### Explicit Exclusions
- Autonomous web browsing or unsupervised agentic loops.
- Permitting LLM confidence scores to override factual ground truth without human verification.
- Hardcoded or bundled API keys in client code.

---

## Version 2.5 — Lead Organization and Productivity
**Status:** **Planned**

### Purpose
Equip high-volume lead researchers with powerful batch editing, custom data schemas, and reusable productivity templates.

### Scope & Key Capabilities
- **Custom Schema & Fields:** Define custom lead attributes (e.g., "Lead Stage", "Outreach Channel", "Notes") mapped to custom Google Sheet columns.
- **Batch Editing:** Bulk-modify lead tags, categories, or notes directly within the extension review table before export.
- **Saved Research Presets:** Save search configurations, target cities, and destination mappings as one-click research presets.
- **Advanced Duplicate Management:** Fuzzy name and address deduplication with side-by-side record merging.
- **User-Defined Collection Rules:** Automated tagging and filtering based on user criteria (e.g., minimum 4.0 rating, verified phone required).

---

## Version 3.0 — Commercial Expansion
**Status:** **Deferred / Future Roadmap**

### Purpose
Scale LeadWidget into a collaborative team platform with managed cloud services, multi-user sync, and CRM integrations.

### Scope & Key Capabilities
- **Optional Cloud Backend:** Opt-in cloud database for cross-device synchronization and team collaboration.
- **Shared Team Workspaces:** Collaborative lead queues with team role-based access control.
- **Direct CRM Connectors:** Native export integrations for HubSpot, Salesforce, Pipedrive, and webhook endpoints alongside Google Sheets.
- **Managed AI & Proxy Tier:** Optional paid subscription providing managed AI inference (Groq/OpenAI proxy) without requiring users to bring their own API keys.
- **Advanced Analytics:** Team acquisition metrics, duplicate rates, and source efficacy reporting.
