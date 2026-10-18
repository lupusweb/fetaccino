import { ExtensionMessage, MessageType, ExtensionResponse } from '../domain/messages';
import { logger } from '../services/logger';
import { analyzeCurrentPage } from './detector';

import { startObserver } from './observer';
import { initUI, injectSelectionUI } from './ui';
import './index.css';

initUI();

logger.info('Content script loaded on:', window.location.href);

startObserver((context) => {
  logger.info('Context updated via observer:', context);
  injectSelectionUI();
  chrome.runtime.sendMessage({
    type: MessageType.CONTEXT_UPDATED,
    payload: { hasBusinessContext: context.hasBusinessContext }
  });
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    try {
      logger.info('Content script received message:', message.type);

      if (message.type === MessageType.PING) {
      const response: ExtensionResponse = {
        success: true,
        data: `Pong from content script! Original text: ${message.payload.text}`
      };
      sendResponse(response);
    }
    
    if (message.type === MessageType.DETECT_PAGE_CONTEXT) {
      const context = analyzeCurrentPage(window.location.href);
      sendResponse({ success: true, data: context });
    }
    

      return true;
    } catch (error: any) {
      logger.error('Error in content script listener:', error);
      sendResponse({ success: false, error: 'Content script error: ' + error.message });
      return false;
    }
  }
);
