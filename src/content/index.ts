import { ExtensionMessage, MessageType, ExtensionResponse } from '../domain/messages';
import { logger } from '../services/logger';
import { analyzeCurrentPage } from './detector';
import { PageSource, BusinessData } from '../domain/business';
import { parseMapsBulk, parseMapsPage } from './parsers/maps';
import { parseSearchBulk, parseSearchPage } from './parsers/search';

import { startObserver } from './observer';
import { initUI, injectSelectionUI } from './ui';
import './index.css';

initUI();

logger.info('Content script loaded on:', window.location.href);

startObserver(
  (context) => {
    logger.info('Context updated via observer:', context);
    injectSelectionUI();
    chrome.runtime.sendMessage({
      type: MessageType.CONTEXT_UPDATED,
      payload: { hasBusinessContext: context.hasBusinessContext }
    });
  },
  () => {
    // Fast DOM mutation callback: injects checkboxes immediately when cards appear
    injectSelectionUI();
  }
);

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    try {
      logger.info('Content script received message:', message.type);

      if (message.type === MessageType.PING) {
        const response: ExtensionResponse = {
          success: true,
          data: `Pong from content script! Original text: ${(message as any).payload?.text}`
        };
        sendResponse(response);
        return true;
      }
      
      if (message.type === MessageType.DETECT_PAGE_CONTEXT) {
        const context = analyzeCurrentPage(window.location.href);
        sendResponse({ success: true, data: context });
        return true;
      }

      if ((message as any).type === 'GET_PAGE_LEADS') {
        const context = analyzeCurrentPage(window.location.href);
        let leads: BusinessData[] = [];
        let activeLead: BusinessData | null = null;

        if (context.source === PageSource.MAPS) {
          leads = parseMapsBulk(document);
          const currentPlace = parseMapsPage(document, window.location.href);
          if (currentPlace && currentPlace.name) {
            activeLead = currentPlace;
          }
        } else if (context.source === PageSource.SEARCH) {
          leads = parseSearchBulk(document);
          const currentKp = parseSearchPage(document, window.location.href);
          if (currentKp && currentKp.name) {
            activeLead = currentKp;
          }
        }

        sendResponse({ 
          success: true, 
          data: { 
            leads, 
            activeLead,
            source: context.source 
          } 
        });
        return true;
      }

      return true;
    } catch (error: any) {
      logger.error('Error in content script listener:', error);
      sendResponse({ success: false, error: 'Content script error: ' + error.message });
      return false;
    }
  }
);
