export enum MessageType {
  PING = 'PING',
  GET_SETTINGS = 'GET_SETTINGS',
  SAVE_SETTINGS = 'SAVE_SETTINGS',
  GET_AUTH_STATUS = 'GET_AUTH_STATUS',
  AUTHENTICATE = 'AUTHENTICATE',
  TEST_SHEETS_CONNECTION = 'TEST_SHEETS_CONNECTION',
  DETECT_PAGE_CONTEXT = 'DETECT_PAGE_CONTEXT',
  CONTEXT_UPDATED = 'CONTEXT_UPDATED',
  GET_DESTINATION = 'GET_DESTINATION',
  SET_DESTINATION = 'SET_DESTINATION',
  GET_RECENT_DESTINATIONS = 'GET_RECENT_DESTINATIONS',
  SEARCH_SPREADSHEETS = 'SEARCH_SPREADSHEETS',
  CREATE_SPREADSHEET = 'CREATE_SPREADSHEET',
  GET_SPREADSHEET_DETAILS = 'GET_SPREADSHEET_DETAILS',
  
  // V1.0 Queue Commands
  ADD_TO_QUEUE = 'ADD_TO_QUEUE',
  REMOVE_FROM_QUEUE = 'REMOVE_FROM_QUEUE',
  GET_QUEUE = 'GET_QUEUE',
  CLEAR_QUEUE = 'CLEAR_QUEUE',
  BATCH_SAVE_QUEUE = 'BATCH_SAVE_QUEUE'
}

export interface PingMessage {
  type: MessageType.PING;
  payload: { text: string };
}

export interface DetectPageContextMessage {
  type: MessageType.DETECT_PAGE_CONTEXT;
}

export interface ContextUpdatedMessage {
  type: MessageType.CONTEXT_UPDATED;
  payload: { hasBusinessContext: boolean };
}

export interface GetAuthStatusMessage {
  type: MessageType.GET_AUTH_STATUS;
}

export interface AuthenticateMessage {
  type: MessageType.AUTHENTICATE;
  payload: { interactive: boolean };
}

export interface TestSheetsConnectionMessage {
  type: MessageType.TEST_SHEETS_CONNECTION;
  payload: { spreadsheetId: string };
}

export interface GetDestinationMessage {
  type: MessageType.GET_DESTINATION;
}

export interface SetDestinationMessage {
  type: MessageType.SET_DESTINATION;
  payload: { destination: any };
}

export interface GetRecentDestinationsMessage {
  type: MessageType.GET_RECENT_DESTINATIONS;
}

export interface SearchSpreadsheetsMessage {
  type: MessageType.SEARCH_SPREADSHEETS;
  payload: { query?: string };
}

export interface CreateSpreadsheetMessage {
  type: MessageType.CREATE_SPREADSHEET;
  payload: { title: string };
}

export interface GetSpreadsheetDetailsMessage {
  type: MessageType.GET_SPREADSHEET_DETAILS;
  payload: { spreadsheetId: string };
}

export interface AddToQueueMessage {
  type: MessageType.ADD_TO_QUEUE;
  payload: { businessData: any };
}

export interface RemoveFromQueueMessage {
  type: MessageType.REMOVE_FROM_QUEUE;
  payload: { sourceId: string };
}

export interface GetQueueMessage {
  type: MessageType.GET_QUEUE;
}

export interface ClearQueueMessage {
  type: MessageType.CLEAR_QUEUE;
}

export interface BatchSaveQueueMessage {
  type: MessageType.BATCH_SAVE_QUEUE;
}

// Union of all possible messages
export type ExtensionMessage = 
  | PingMessage 
  | DetectPageContextMessage
  | ContextUpdatedMessage
  | GetAuthStatusMessage
  | AuthenticateMessage
  | TestSheetsConnectionMessage
  | GetDestinationMessage
  | SetDestinationMessage
  | GetRecentDestinationsMessage
  | SearchSpreadsheetsMessage
  | CreateSpreadsheetMessage
  | GetSpreadsheetDetailsMessage
  | AddToQueueMessage
  | RemoveFromQueueMessage
  | GetQueueMessage
  | ClearQueueMessage
  | BatchSaveQueueMessage;

export interface ExtensionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
