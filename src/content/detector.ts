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
    if (url.hostname.startsWith('maps.') || url.pathname.startsWith('/maps') || url.pathname.includes('/maps')) {
      return PageSource.MAPS;
    }
    
    // Check for Google Search / Places tab
    if (
      url.pathname.startsWith('/search') || 
      url.pathname.startsWith('/webhp') || 
      url.searchParams.has('q') ||
      url.searchParams.has('udm') ||
      url.searchParams.has('tbm')
    ) {
      return PageSource.SEARCH;
    }

    // In-DOM verification for client-side search navigation
    if (typeof document !== 'undefined') {
      if (document.querySelector('div[role="feed"], div[id^="pv-"], div.dbg0pd, #search, #rso, span.HjGrCb')) {
        return PageSource.SEARCH;
      }
      if (document.querySelector('h1.DUwDvf, a.hfpxzc, .fontHeadlineSmall')) {
        return PageSource.MAPS;
      }
    }
  } catch (e) {
    return PageSource.UNKNOWN;
  }
  
  return PageSource.UNKNOWN;
};

export const detectBusinessContext = (source: PageSource): boolean => {
  if (source === PageSource.UNKNOWN) return false;

  if (source === PageSource.MAPS) {
    const hasMapsBusinessTitle = !!document.querySelector('h1.DUwDvf');
    const hasActionButtons = !!document.querySelector('button[data-value="Save"]') || !!document.querySelector('button[data-value="Share"]');
    const hasCards = !!document.querySelector('a.hfpxzc, div[role="article"], .fontHeadlineSmall');
    return hasMapsBusinessTitle || hasActionButtons || hasCards;
  }

  if (source === PageSource.SEARCH) {
    // Places tab listing cards
    const hasPlacesTabCards = !!document.querySelector('div[id^="pv-"], div.dbg0pd, div.VkpGBb, div.rllt__details, div[data-cid]');
    // Detail panel / knowledge panel
    const hasDetailPanel = !!document.querySelector('span.HjGrCb, [role="heading"].HjGrCb, [data-attrid="title"], div.SPZz6b, h2.qrShPb, #rhs .kp-wholepage, [data-attrid="kp-page-block-local-business"]');

    return hasPlacesTabCards || hasDetailPanel;
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
