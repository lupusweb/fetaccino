import { analyzeCurrentPage, PageDetectionResult } from './detector';
import { logger } from '../services/logger';

type ContextChangeCallback = (context: PageDetectionResult) => void;

let observer: MutationObserver | null = null;
let lastUrl: string = window.location.href;
let timeoutId: number | null = null;
let lastContextHasBusiness = false;

export const startObserver = (onContextChange: ContextChangeCallback) => {
  if (observer) return;

  const checkContext = () => {
    const currentUrl = window.location.href;
    const context = analyzeCurrentPage(currentUrl);

    // Trigger update if URL changed or business context availability changed
    if (currentUrl !== lastUrl || context.hasBusinessContext !== lastContextHasBusiness) {
      lastUrl = currentUrl;
      lastContextHasBusiness = context.hasBusinessContext;
      onContextChange(context);
    }
  };

  observer = new MutationObserver(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
    // Debounce DOM mutations to prevent excessive CPU usage
    timeoutId = window.setTimeout(() => {
      checkContext();
    }, 1000); 
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  // Initial check
  checkContext();
  logger.info('MutationObserver started for dynamic navigation detection');
};

export const stopObserver = () => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (timeoutId) {
    window.clearTimeout(timeoutId);
    timeoutId = null;
  }
  logger.info('MutationObserver stopped');
};
