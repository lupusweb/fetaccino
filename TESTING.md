# Testing Strategy

## Automated Tests
- Framework: Vitest
- Unit tests for domain parsing, business extraction logic, URL normalization, duplicate detection.

## Manual Testing
Manual tests should be performed against real Google Search and Google Maps pages to ensure DOM structure compatibility.
Use fixtures captured from actual DOM for unit testing, but do not rely solely on automated tests for end-to-end functionality as Google's DOM may change unpredictably.
