import { PageSource } from '../domain/business';

export interface PageDetectionResult {
  isSupported: boolean;
  source: PageSource;
  url: string;
  hasBusinessContext: boolean;
}

export const detectPageSource = (urlStr: string): PageSource => {
  try {
    const url = new URL(urlStr);
    
    // Check for Google Maps
    if (url.pathname.startsWith('/maps')) {
      return PageSource.MAPS;
    }
    
    // Check for Google Search
    if (url.pathname === '/search' && url.searchParams.has('q')) {
      return PageSource.SEARCH;
    }

    // Sometimes search doesn't explicitly have /search, but has q parameter on root
    if (url.pathname === '/' && url.searchParams.has('q')) {
      return PageSource.SEARCH;
    }

  } catch (e) {
    return PageSource.UNKNOWN;
  }
  
  return PageSource.UNKNOWN;
};

export const detectBusinessContext = (source: PageSource): boolean => {
  if (source === PageSource.UNKNOWN) return false;

  if (source === PageSource.MAPS) {
    // Maps business side-panel heuristic
    // h1 with class DUwDvf usually contains the business name
    const hasMapsBusinessTitle = !!document.querySelector('h1.DUwDvf');
    // Action buttons typically found on Maps listings
    const hasActionButtons = !!document.querySelector('button[data-value="Save"]') || !!document.querySelector('button[data-value="Share"]');
    
    return hasMapsBusinessTitle || hasActionButtons;
  }

  if (source === PageSource.SEARCH) {
    // Search knowledge panel heuristic
    // Local business KP
    const hasLocalBusinessKp = !!document.querySelector('[data-attrid="kp-page-block-local-business"]');
    // Generic KP on the right hand side
    const hasGenericKp = !!document.querySelector('#rhs .kp-wholepage');
    // Places list / Map pack
    const hasMapPack = !!document.querySelector('.O8T7bf'); 
    
    return hasLocalBusinessKp || hasGenericKp || hasMapPack;
  }

  return false;
};

export const analyzeCurrentPage = (urlStr: string): PageDetectionResult => {
  const source = detectPageSource(urlStr);
  const isSupported = source !== PageSource.UNKNOWN;
  const hasBusinessContext = isSupported ? detectBusinessContext(source) : false;

  return {
    isSupported,
    source,
    url: urlStr,
    hasBusinessContext
  };
};
