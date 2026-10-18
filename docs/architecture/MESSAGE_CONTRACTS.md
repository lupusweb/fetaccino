# LeadWidget — Message Contracts Specification

## 1. Overview
All cross-context communication in LeadWidget (Content Script <-> Background Service Worker <-> Popup/Options) is mediated via `chrome.runtime.sendMessage`. Every message conforms to a strongly-typed contract defined in `src/domain/messages.ts`.

---

## 2. Implemented Contracts (V1.0)

### 2.1 Authentication & Configuration
| Message Action | Source | Target | Payload | Response Payload | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET_AUTH_STATUS` | Popup / Options | Background | *None* | `{ isAuthenticated: boolean, token?: string }` | **Implemented and verified** |
| `AUTHENTICATE` | Popup / Options | Background | `{ interactive: boolean }` | `{ success: boolean, token?: string }` | **Implemented and verified** |
| `GET_DESTINATION` | Popup / Options | Background | *None* | `SpreadsheetDestination \| null` | **Implemented and verified** |
| `SET_DESTINATION` | Popup / Options | Background | `SpreadsheetDestination` | `{ success: boolean }` | **Implemented and verified** |

### 2.2 Google Drive & Sheets Discovery
| Message Action | Source | Target | Payload | Response Payload | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SEARCH_SPREADSHEETS` | Popup / Options | Background | `{ query: string }` | `Array<{ id: string, name: string }>` | **Implemented and verified** |
| `GET_SPREADSHEET_DETAILS` | Popup / Options | Background | `{ spreadsheetId: string }` | `Array<{ sheetId: string, sheetName: string }>` | **Implemented and verified** |

### 2.3 Queue Management & Bulk Export (V1.0)
| Message Action | Source | Target | Payload | Response Payload | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ADD_TO_QUEUE` | Content Script | Background | `BusinessData` | `QueueItem[]` | **Implemented and verified** |
| `REMOVE_FROM_QUEUE` | Content / Popup | Background | `{ sourceId: string }` | `QueueItem[]` | **Implemented and verified** |
| `GET_QUEUE` | Content / Popup | Background | *None* | `QueueItem[]` | **Implemented and verified** |
| `CLEAR_QUEUE` | Popup | Background | *None* | `{ success: boolean }` | **Implemented and verified** |
| `BATCH_SAVE_QUEUE` | Popup | Background | *None* | `BatchSaveResult` | **Implemented but unverified live** |

---

## 3. Planned Evolution Contracts (V1.1 – V2.0)

### 3.1 Research Session & Job Lifecycle (V1.1)
| Message Action | Source | Target | Payload | Response Payload | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CREATE_SESSION` | Popup | Background | `{ name: string, destination: SpreadsheetDestination }` | `ResearchSession` | **Planned (V1.1)** |
| `GET_ACTIVE_SESSION` | Popup / Content | Background | *None* | `ResearchSession \| null` | **Planned (V1.1)** |
| `LIST_SESSIONS` | Popup | Background | *None* | `ResearchSession[]` | **Planned (V1.1)** |
| `SWITCH_SESSION` | Popup | Background | `{ sessionId: string }` | `ResearchSession` | **Planned (V1.1)** |

### 3.2 Multi-Source Ingestion & Highlights (V1.2)
| Message Action | Source | Target | Payload | Response Payload | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `INGEST_CANDIDATE_FROM_SELECTION` | Content (ContextMenu) | Background | `{ name: string, sourceUrl: string, contextSnippet: string }` | `Candidate` | **Planned (V1.2)** |
| `INGEST_EDITORIAL_BATCH` | Content Script | Background | `Candidate[]` | `{ addedCount: number }` | **Planned (V1.2)** |

### 3.3 Asynchronous Enrichment Engine (V1.3 – V1.4)
| Message Action | Source | Target | Payload | Response Payload | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ENRICH_CANDIDATE_SEARCH` | Background / Popup | Background | `{ candidateId: string }` | `ResearchJob` | **Planned (V1.3)** |
| `ENRICH_CANDIDATE_WEBSITE` | Background / Popup | Background | `{ candidateId: string, websiteUrl: string }` | `ResearchJob` | **Planned (V1.4)** |
| `GET_JOB_STATUS` | Popup | Background | `{ jobId: string }` | `ResearchJob` | **Planned (V1.3)** |

### 3.4 Guardrailed AI Inference (V2.0)
| Message Action | Source | Target | Payload | Response Payload | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `EXECUTE_AI_EXTRACTION` | Content / Popup | Background | `AiInferenceRequest` | `AiInferenceResponse` | **Planned (V2.0)** |
| `RECONCILE_ENTITY_CONFLICT` | Popup | Background | `{ candidateId: string, conflictData: any }` | `AiInferenceResponse` | **Planned (V2.0)** |

---

## 4. Error Handling Envelope
All message handlers wrap execution in standard responses:

```typescript
export interface ExtensionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
```

If an unhandled exception or Google API quota failure occurs, the response object returns `{ success: false, error: "human-readable error message" }` to prevent UI silent failures.
