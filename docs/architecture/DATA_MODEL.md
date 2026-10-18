# LeadWidget — Data Model Specification

## 1. Overview
This document specifies the TypeScript domain models for LeadWidget. It establishes clear distinctions between current V1.0 operational models and the planned data structures required for multi-source research, session management, and AI assistance in subsequent versions.

---

## 2. Implemented Models (V1.0)

### 2.1 `BusinessData` (Normalized Lead)
**Status:** **Implemented and verified** (`src/domain/business.ts`)

Represents a single business entity extracted from Google Maps or Google Search, normalized and ready for Google Sheets serialization.

```typescript
export interface BusinessData {
  name: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  phone?: string;
  website?: string;
  googleMapsUrl?: string;

  // Metadata & Internal Tracking
  _sourceId?: string;           // Unique identifier generated from URL or name+address
  _status?: 'pending' | 'duplicate' | 'saved' | 'failed';
  _errorMsg?: string;
}
```

### 2.2 `QueueItem` (Candidate in Selection/Review Queue)
**Status:** **Implemented and verified** (`src/domain/business.ts`)

Wraps `BusinessData` with selection and queue state in the extension popup and background worker.

```typescript
export interface QueueItem {
  id: string;                   // Matches _sourceId
  business: BusinessData;
  selected: boolean;
  timestamp: number;
}
```

### 2.3 `SpreadsheetDestination`
**Status:** **Implemented and verified** (`src/domain/destination.ts`)

Stores the targeted Google Drive spreadsheet and worksheet configuration.

```typescript
export interface SpreadsheetDestination {
  spreadsheetId: string;
  spreadsheetName: string;
  sheetId: string;
  sheetName: string;
}
```

### 2.4 `BatchSaveResult`
**Status:** **Implemented and verified** (`src/domain/messages.ts`)

Returned by the background worker after processing a bulk export request.

```typescript
export interface BatchSaveResult {
  savedCount: number;
  skippedCount: number;
  failedCount: number;
  failedItems?: Array<{ id: string; name: string; error: string }>;
}
```

---

## 3. Planned Evolution Models (V1.1 – V2.0)

### 3.1 `FieldProvenance` (Evidence-Backed Data)
**Status:** **Planned (V1.1 – V1.4)**

Captures strict evidence tracking for each extracted field, supporting auditability, transparent uncertainty, and source attribution.

```typescript
export interface FieldProvenance<T = string | number> {
  value: T;
  sourceUrl: string;
  sourceContextSnippet?: string; // Text fragment or sentence providing evidence
  extractionMethod: 'dom_direct' | 'schema_org' | 'website_subpage' | 'ai_inference';
  confidenceScore: number;       // Deterministic extraction reliability (0.0 to 1.0)
  extractedAt: number;           // Unix epoch timestamp
  verifiedByUser?: boolean;
}
```

### 3.2 `Candidate` (Common Business Candidate)
**Status:** **Planned (V1.1)**

A generalized entity model representing a discovered business mention across any source before final identity resolution.

```typescript
export interface Candidate {
  id: string;                    // Stable hash (UUID or hash of name + location/url)
  sessionId: string;             // Associated ResearchSession ID
  observedName: string;
  sourceDomain: 'google_maps' | 'google_search' | 'editorial' | 'yelp' | 'website';
  sourceUrl: string;
  discoveryTimestamp: number;
  status: 'discovered' | 'queued' | 'enriching' | 'resolved' | 'ambiguous' | 'exported';

  // Field-level data with provenance
  fields: {
    name: FieldProvenance<string>;
    category?: FieldProvenance<string>;
    phone?: FieldProvenance<string>;
    address?: FieldProvenance<string>;
    website?: FieldProvenance<string>;
    rating?: FieldProvenance<number>;
    reviewCount?: FieldProvenance<number>;
  };

  // Ambiguity & Resolution Flagging
  ambiguityFlags?: Array<{
    field: string;
    description: string;
    conflictingValues: string[];
  }>;
}
```

### 3.3 `ResearchSession` (Destination-Bound Workspace)
**Status:** **Planned (V1.1)**

Encapsulates a user's multi-page lead research campaign, binding discovered candidates to a dedicated destination.

```typescript
export interface ResearchSession {
  id: string;                    // Unique UUID
  name: string;                  // User-assigned name (e.g., "Austin Plumbers 2026")
  createdAt: number;
  updatedAt: number;
  sourceUrls: string[];          // List of pages browsed during this session
  destination: SpreadsheetDestination;
  settings: {
    autoDeduplicate: boolean;
    enrichViaSearch: boolean;
    enrichViaWebsite: boolean;
  };
  candidateCount: number;
}
```

### 3.4 `ResearchJob` (Asynchronous Job State Machine)
**Status:** **Planned (V1.1 – V1.3)**

Tracks asynchronous enrichment and resolution tasks executed by the Service Worker.

```typescript
export interface ResearchJob {
  jobId: string;
  candidateId: string;
  stage: 'pending' | 'searching' | 'inspecting_web' | 'reconciling' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  attempts: number;
  error?: string;
}
```

### 3.5 `AiInferenceRequest` & `AiInferenceResponse`
**Status:** **Planned / Experimental (V2.0)**

Provider-independent contract for Groq (or other future AI providers).

```typescript
export interface AiInferenceRequest {
  task: 'extract_mentions' | 'classify_relevance' | 'reconcile_conflict';
  untrustedInputText: string;
  contextMetadata: {
    sourceUrl: string;
    pageTitle?: string;
  };
  expectedSchema: Record<string, any>;
}

export interface AiInferenceResponse<T = any> {
  success: boolean;
  data?: T;
  rawExplanation?: string;
  error?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
  };
}
```

---

## 4. Model Storage Strategy
- **`chrome.storage.local`**: Stores `candidateQueue`, active `ResearchSession` data, cached search results, and ongoing `ResearchJob` states. (Chosen due to unlimited per-item capacity and resiliency against worker death).
- **`chrome.storage.sync`**: Stores lightweight user preferences and the globally active `SpreadsheetDestination` pointer (< 8KB limit).
- **Google Sheets API v4**: Serves as the definitive destination storage for completed `ExportedRecord` rows.
