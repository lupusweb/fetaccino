import { analyzeCurrentPage, PageDetectionResult } from './detector';
import { logger } from '../services/logger';

type ContextChangeCallback = (context: PageDetectionResult) => void;
type DomMutateCallback = () => void;

let observer: MutationObserver | null = null;
let lastUrl: string = window.location.href;
let mutateTimeoutId: number | null = null;
let contextTimeoutId: number | null = null;
let lastContextHasBusiness = false;
let lastInjectTime = 0;
const THROTTLE_MS = 100; // Fast responsive injection without being starved by streaming AI tokens

export const startObserver = (onContextChange: ContextChangeCallback, onDomMutate?: DomMutateCallback) => {
  if (observer) return;

  const checkContext = () => {
    const currentUrl = window.location.href;
    const context = analyzeCurrentPage(currentUrl);

    if (currentUrl !== lastUrl || context.hasBusinessContext !== lastContextHasBusiness) {
      lastUrl = currentUrl;
      lastContextHasBusiness = context.hasBusinessContext;
      onContextChange(context);
    }
  };

  observer = new MutationObserver(() => {
    const now = Date.now();

    // Throttled fast injection: fires every 100ms even if DOM is rapidly mutating (e.g. streaming chat)
    if (now - lastInjectTime >= THROTTLE_MS) {
      lastInjectTime = now;
      if (onDomMutate) onDomMutate();
    } else {
      if (mutateTimeoutId) {
        window.clearTimeout(mutateTimeoutId);
      }
      mutateTimeoutId = window.setTimeout(() => {
        lastInjectTime = Date.now();
        if (onDomMutate) onDomMutate();
      }, THROTTLE_MS);
    }

    // Context & badge update debounce (200ms)
    if (contextTimeoutId) {
      window.clearTimeout(contextTimeoutId);
    }
    contextTimeoutId = window.setTimeout(() => {
      checkContext();
    }, 200);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  // Initial check & immediate injection
  checkContext();
  if (onDomMutate) onDomMutate();
  logger.info('MutationObserver started with throttled responsive injection');
};

export const stopObserver = () => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (mutateTimeoutId) {
    window.clearTimeout(mutateTimeoutId);
    mutateTimeoutId = null;
  }
  if (contextTimeoutId) {
    window.clearTimeout(contextTimeoutId);
    contextTimeoutId = null;
  }
  logger.info('MutationObserver stopped');
};
