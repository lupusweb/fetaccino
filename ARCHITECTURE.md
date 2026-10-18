# LeadWidget — System Architecture Overview

> **Authoritative Specification:** For the complete, detailed architecture specification and evolution roadmap, see [docs/architecture/SYSTEM_ARCHITECTURE.md](file:///d:/Coding/leadwidget/docs/architecture/SYSTEM_ARCHITECTURE.md).

LeadWidget is built as a Chrome Extension using **Manifest V3**, **React 18**, **TypeScript**, and **Vite**.

## System Diagram
```text
Google Maps / Google Search / Editorial
                  │
                  ▼
          Content Script (DOM)
       ┌──────────┴──────────┐
       ▼                     ▼
Parser (Bulk / Panel)   In-Page Selection UI
       │                     │
       └──────────┬──────────┘
                  ▼
           Runtime Messaging
                  │
                  ▼
      Service Worker (Background)
       ┌──────────┴──────────┐
       ▼                     ▼
Local Queue Storage    Google Sheets API v4
 (chrome.storage)      (OAuth via chrome.identity)
```

## Directory Structure
- `src/background/`: Background service worker scripts (`index.ts`, `auth.ts`).
- `src/content/`: Content scripts, DOM observers, parsers, and in-page UI overlays (`ui.ts`, `observer.ts`, `parsers/`).
- `src/popup/`: React-based UI for lead review and batch export.
- `src/options/`: React-based options UI for authentication and destination selection.
- `src/services/`: External integrations and storage abstractions (`sheets.ts`, `storage.ts`, `logger.ts`).
- `src/domain/`: Shared domain interfaces (`business.ts`, `destination.ts`, `messages.ts`).

## Core Architecture Documents
- [System Architecture](file:///d:/Coding/leadwidget/docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Data Model](file:///d:/Coding/leadwidget/docs/architecture/DATA_MODEL.md)
- [Security & Privacy](file:///d:/Coding/leadwidget/docs/architecture/SECURITY_AND_PRIVACY.md)
- [Message Contracts](file:///d:/Coding/leadwidget/docs/architecture/MESSAGE_CONTRACTS.md)
