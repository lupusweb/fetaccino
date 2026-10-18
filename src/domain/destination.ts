export interface SpreadsheetDestination {
  spreadsheetId: string;
  spreadsheetName?: string;
  sheetId?: string; // Optional gid
  sheetName?: string; // e.g. "Leads" or "Sheet1"
  lastUsed?: number;
}
