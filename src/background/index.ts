import { ExtensionMessage, MessageType, ExtensionResponse } from '../domain/messages';
import { logger } from '../services/logger';
import { getAuthToken } from './auth';
import { appendMultipleBusinessesToSheet, testSheetsConnection, filterDuplicates, searchSpreadsheets, getSpreadsheetDetails, createSpreadsheet } from '../services/sheets';
import { storageService } from '../services/storage';
import { QueueItem } from '../domain/business';

const getDestination = (): Promise<any> => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['currentDestination', 'spreadsheetId'], (result) => {
      if (result.currentDestination) {
        resolve(result.currentDestination);
      } else if (result.spreadsheetId) {
        // Fallback for legacy configs
        resolve({
          spreadsheetId: result.spreadsheetId,
          spreadsheetName: 'Legacy Spreadsheet',
          sheetName: 'Sheet1'
        });
      } else {
        resolve(null);
      }
    });
  });
};

logger.info('Background service worker initialized.');

chrome.runtime.onInstalled.addListener(() => {
  logger.info('Extension installed');
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    try {
      logger.info('Received message in background:', message.type);

      if (message.type === MessageType.PING || 
          message.type === MessageType.DETECT_PAGE_CONTEXT) {
        // Forward to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0 && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, message, (response: ExtensionResponse) => {
              if (chrome.runtime.lastError) {
                logger.warn('Error forwarding to content script:', chrome.runtime.lastError.message);
                sendResponse({ success: false, error: 'Content script not found or inactive.' });
              } else {
                sendResponse(response);
              }
            });
          } else {
            sendResponse({ success: false, error: 'No active tab found' });
          }
        });
        return true; // Keep message channel open for async response
      }

      if (message.type === MessageType.CONTEXT_UPDATED) {
        const msg = message as any;
        const tabId = _sender?.tab?.id;
        if (tabId) {
          if (msg.payload.hasBusinessContext) {
            chrome.action.setBadgeText({ text: '!', tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#1a73e8', tabId });
          } else {
            chrome.action.setBadgeText({ text: '', tabId });
          }
        }
        sendResponse({ success: true });
        return false;
      }

      if (message.type === MessageType.GET_AUTH_STATUS) {
        getAuthToken(false)
          .then((token) => sendResponse({ success: true, data: { isAuthenticated: !!token } }))
          .catch(() => sendResponse({ success: true, data: { isAuthenticated: false } }));
        return true;
      }

      if (message.type === MessageType.AUTHENTICATE) {
        const msg = message as any;
        getAuthToken(msg.payload.interactive)
          .then((token) => sendResponse({ success: true, data: { token } }))
          .catch((error) => sendResponse({ success: false, error: error.toString() }));
        return true;
      }

      if (message.type === MessageType.TEST_SHEETS_CONNECTION) {
        const msg = message as any;
        getAuthToken(false)
          .then((token) => {
             testSheetsConnection(token, msg.payload.spreadsheetId)
               .then(() => sendResponse({ success: true }))
               .catch((err) => sendResponse({ success: false, error: err.message }));
          })
          .catch((error) => sendResponse({ success: false, error: 'Auth required: ' + error.toString() }));
        return true;
      }
      
      if (message.type === MessageType.GET_DESTINATION) {
        getDestination().then((dest) => {
          sendResponse({ success: true, data: dest });
        });
        return true;
      }

      if (message.type === MessageType.SET_DESTINATION) {
        const msg = message as any;
        const dest = msg.payload.destination;
        dest.lastUsed = Date.now();
        chrome.storage.sync.set({ currentDestination: dest }, () => {
          // Add to recents
          chrome.storage.local.get(['recentDestinations'], (res) => {
            let recents = res.recentDestinations || [];
            // Remove if already exists to put it at the top
            recents = recents.filter((r: any) => r.spreadsheetId !== dest.spreadsheetId || r.sheetName !== dest.sheetName);
            recents.unshift(dest);
            if (recents.length > 5) recents = recents.slice(0, 5);
            chrome.storage.local.set({ recentDestinations: recents });
          });
          sendResponse({ success: true });
        });
        return true;
      }

      if (message.type === MessageType.GET_RECENT_DESTINATIONS) {
        chrome.storage.local.get(['recentDestinations'], (res) => {
          sendResponse({ success: true, data: res.recentDestinations || [] });
        });
        return true;
      }

      if (message.type === MessageType.SEARCH_SPREADSHEETS) {
        const msg = message as any;
        getAuthToken(false)
          .then((token) => {
            searchSpreadsheets(token, msg.payload.query)
              .then((files) => sendResponse({ success: true, data: files }))
              .catch((err) => sendResponse({ success: false, error: err.message }));
          })
          .catch((error) => sendResponse({ success: false, error: error.toString() }));
        return true;
      }

      if (message.type === MessageType.GET_SPREADSHEET_DETAILS) {
        const msg = message as any;
        getAuthToken(false)
          .then((token) => {
            getSpreadsheetDetails(token, msg.payload.spreadsheetId)
              .then((details) => sendResponse({ success: true, data: details }))
              .catch((err) => sendResponse({ success: false, error: err.message }));
          })
          .catch((error) => sendResponse({ success: false, error: error.toString() }));
        return true;
      }

      if (message.type === MessageType.CREATE_SPREADSHEET) {
        const msg = message as any;
        getAuthToken(false)
          .then((token) => {
            createSpreadsheet(token, msg.payload.title)
              .then((dest) => sendResponse({ success: true, data: dest }))
              .catch((err) => sendResponse({ success: false, error: err.message }));
          })
          .catch((error) => sendResponse({ success: false, error: error.toString() }));
        return true;
      }

      // V1.0 Queue Operations
      if (message.type === MessageType.GET_QUEUE) {
        storageService.getQueue().then(queue => {
          sendResponse({ success: true, data: queue });
        });
        return true;
      }

      if (message.type === MessageType.ADD_TO_QUEUE) {
        const msg = message as any;
        const business = msg.payload.businessData;
        const sourceId = business._sourceId || business.name; // Fallback
        
        const item: QueueItem = {
          id: sourceId,
          business,
          status: 'queued',
          addedAt: Date.now()
        };
        
        storageService.addToQueue(item).then(() => {
          sendResponse({ success: true });
        }).catch(err => {
          sendResponse({ success: false, error: err.message });
        });
        return true;
      }

      if (message.type === MessageType.REMOVE_FROM_QUEUE) {
        const msg = message as any;
        storageService.removeFromQueue(msg.payload.sourceId).then(() => {
          sendResponse({ success: true });
        }).catch(err => {
          sendResponse({ success: false, error: err.message });
        });
        return true;
      }

      if (message.type === MessageType.CLEAR_QUEUE) {
        storageService.clearQueue().then(() => {
          sendResponse({ success: true });
        }).catch(err => {
          sendResponse({ success: false, error: err.message });
        });
        return true;
      }
      
      if (message.type === MessageType.BATCH_SAVE_QUEUE) {
        getAuthToken(false)
          .then(async (token) => {
             const dest = await getDestination();
             if (!dest) {
               sendResponse({ success: false, error: 'Destination is not configured.' });
               return;
             }
             
             const queue = await storageService.getQueue();
             if (queue.length === 0) {
               sendResponse({ success: true });
               return;
             }
             
             const businessDataArray = queue.map(q => q.business);
             
             try {
               const { newLeads, duplicates } = await filterDuplicates(token, dest, businessDataArray);
               
               if (newLeads.length > 0) {
                 await appendMultipleBusinessesToSheet(token, dest, newLeads);
               }
               
               await storageService.clearQueue(); // Empty queue after successful export
               sendResponse({ 
                 success: true, 
                 data: { 
                   saved: newLeads.length, 
                   skipped: duplicates.length 
                 } 
               });
             } catch (err: any) {
               sendResponse({ success: false, error: err.message });
             }
          })
          .catch((error) => sendResponse({ success: false, error: error.toString() }));
        return true;
      }
      
      return false;
    } catch (globalError: any) {
      logger.error('Unhandled error in background message listener:', globalError);
      sendResponse({ success: false, error: 'Internal background error: ' + globalError.message });
      return false;
    }
  }
);
