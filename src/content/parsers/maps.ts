import { BusinessData, PageSource } from '../../domain/business';
import { 
  normalizeText, 
  normalizePhone, 
  normalizeRating, 
  normalizeReviewCount, 
  normalizeUrl, 
  calculateConfidence 
} from './normalizer';

/**
 * Parses the single active place details panel (identified by the unique h1.DUwDvf)
 */
export const parseMapsPage = (doc: Document | Element, url?: string): BusinessData => {
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const data: Partial<BusinessData> = {
    source: PageSource.MAPS,
    capturedAt: new Date().toISOString(),
    mapsUrl: normalizeUrl(currentUrl)
  };

  const nameEl = doc.querySelector('h1.DUwDvf');
  data.name = normalizeText(nameEl?.textContent);

  if (!data.name) {
    data.confidenceScore = 0;
    return data as BusinessData;
  }

  const ratingEl = doc.querySelector('div.F7nice span[aria-hidden="true"]');
  data.rating = normalizeRating(ratingEl?.textContent);

  const reviewEl = doc.querySelector('div.F7nice span[aria-label*="reviews"]');
  data.reviewCount = normalizeReviewCount(reviewEl?.getAttribute('aria-label') || reviewEl?.textContent);

  const categoryEl = doc.querySelector('button.DkEaL');
  data.category = normalizeText(categoryEl?.textContent);

  const addressEl = doc.querySelector('button[data-item-id="address"] .Io6YTe');
  data.address = normalizeText(addressEl?.textContent);

  const phoneEl = doc.querySelector('button[data-item-id^="phone:"] .Io6YTe');
  data.phone = normalizePhone(phoneEl?.textContent);

  const websiteEl = doc.querySelector('a[data-item-id="authority"]');
  if (websiteEl) {
    data.website = normalizeUrl(websiteEl.getAttribute('href'));
  }

  let sourceId = currentUrl;
  try {
    const urlObj = new URL(currentUrl);
    sourceId = urlObj.origin + urlObj.pathname;
    sourceId = sourceId.split('/@')[0];
  } catch(e) {}
  data._sourceId = sourceId || (data.name ? `maps_place:${data.name}` : undefined);

  data.confidenceScore = calculateConfidence(data);

  return data as BusinessData;
};

/**
 * Parses a single classic Google Maps listing card (identified by a.hfpxzc)
 */
export const parseSingleCard = (card: Element): BusinessData | null => {
  const name = normalizeText(card.getAttribute('aria-label') || card.textContent);
  const href = card.getAttribute('href');
  if (!name || !href) return null;

  let sourceId = href;
  try {
    const urlObj = new URL(href);
    sourceId = urlObj.origin + urlObj.pathname; 
    sourceId = sourceId.split('/@')[0];
  } catch(e) {}

  const data: Partial<BusinessData> = {
    name,
    mapsUrl: normalizeUrl(href),
    _sourceId: sourceId,
    source: PageSource.MAPS,
    capturedAt: new Date().toISOString()
  };

  const container = card.parentElement;
  if (container) {
    const ratingSpan = container.querySelector('span[aria-label*="stars"], span.MW4etd');
    if (ratingSpan) {
      data.rating = normalizeRating(ratingSpan.getAttribute('aria-label') || ratingSpan.textContent);
    }
    
    const reviewSpan = container.querySelector('span[aria-label*="reviews"]');
    if (reviewSpan) {
      data.reviewCount = normalizeReviewCount(reviewSpan.getAttribute('aria-label') || reviewSpan.textContent);
    }

    const categoryElements = container.querySelectorAll('.W4Efsd span');
    for (const el of categoryElements) {
      const text = el.textContent || '';
      if (text && !text.includes('(') && !text.includes('·') && !text.includes('•') && !text.match(/^[0-9.]/)) {
         data.category = normalizeText(text);
         break;
      }
    }
  }

  data.confidenceScore = calculateConfidence(data);
  return data as BusinessData;
};

/**
 * Parses a conversational / Ask Maps place recommendation.
 * Structurally, genuine places in Google Maps chat MUST contain an interactive anchor linking to the place (/maps/place/).
 */
export const parseAskMapsCard = (linkOrCard: Element): BusinessData | null => {
  // 1. Locate the place link (anchors pointing to /maps/place/)
  const linkEl = (linkOrCard.matches('a[href*="/maps/place"]') ? linkOrCard : linkOrCard.querySelector('a[href*="/maps/place"]')) as HTMLAnchorElement | null;
  const href = linkEl?.getAttribute('href') || (linkOrCard.matches('a[href]') ? linkOrCard.getAttribute('href') : null);
  
  if (!href || !href.includes('/maps/place/')) {
    return null;
  }

  // 2. Identify enclosing card container
  const card = linkOrCard.closest('div[role="article"] > div, div[jsaction*="place"], div[role="listitem"], div[role="article"]') || linkOrCard.parentElement || linkOrCard;

  // 3. Extract business name
  const headingEl = card.querySelector('.fontHeadlineSmall, [role="heading"], h2, h3');
  let name = normalizeText(headingEl?.textContent || linkEl?.getAttribute('aria-label') || linkEl?.textContent);

  // Fallback: extract place name cleanly from the URL pathname (/maps/place/<PlaceName>/)
  if (!name || name.length < 2) {
    try {
      const match = href.match(/\/maps\/place\/([^\/@?#]+)/);
      if (match && match[1]) {
        name = normalizeText(decodeURIComponent(match[1].replace(/\+/g, ' ')));
      }
    } catch(e) {}
  }

  if (!name || name.length < 2) return null;

  // 4. Extract rating & reviews
  let rating: number | undefined;
  let reviewCount: number | undefined;
  let category: string | undefined;

  const ratingEl = card.querySelector('span[aria-label*="stars"], span[aria-label*="rating"]');
  if (ratingEl) {
    rating = normalizeRating(ratingEl.getAttribute('aria-label') || ratingEl.textContent);
  }

  const reviewEl = card.querySelector('span[aria-label*="reviews"]');
  if (reviewEl) {
    reviewCount = normalizeReviewCount(reviewEl.getAttribute('aria-label') || reviewEl.textContent);
  }

  // Look for text matching rating & category in card text
  const textContainers = card.querySelectorAll('span, div, p');
  for (const el of textContainers) {
    const text = el.textContent || '';
    if (!rating && /[0-5]\.[0-9]/.test(text)) {
      const match = text.match(/([0-5]\.[0-9])/);
      if (match) rating = parseFloat(match[1]);
    }
    if ((text.includes('·') || text.includes('•')) && !category) {
      const parts = text.split(/[·•]/);
      const catPart = parts[parts.length - 1].trim();
      if (catPart && catPart.length < 35 && !catPart.includes('Opens') && !catPart.includes('Closed') && !/\d/.test(catPart)) {
        category = normalizeText(catPart);
      }
    }
  }

  let sourceId = href;
  try {
    const urlObj = new URL(href, 'https://www.google.com');
    sourceId = urlObj.origin + urlObj.pathname;
    sourceId = sourceId.split('/@')[0];
  } catch(e) {}

  const data: Partial<BusinessData> = {
    name,
    rating,
    reviewCount,
    category,
    mapsUrl: normalizeUrl(href),
    _sourceId: sourceId || `maps_place:${name}`,
    source: PageSource.MAPS,
    capturedAt: new Date().toISOString()
  };

  data.confidenceScore = calculateConfidence(data);
  return data as BusinessData;
};

/**
 * Bulk extracts places from Google Maps using structural DOM scoping:
 * 1. Classic search results: each item has 'a.hfpxzc'
 * 2. Conversational / Ask Maps: each item has 'a[href*="/maps/place"]'
 * 3. Opened place details pane (h1.DUwDvf) is strictly isolated (its internal sections are never treated as bulk leads)
 */
export const parseMapsBulk = (doc: Document | Element): BusinessData[] => {
  const results: BusinessData[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  // 1. Classic search result cards
  const cards = doc.querySelectorAll('a.hfpxzc');
  cards.forEach((card) => {
    const data = parseSingleCard(card);
    if (data && data._sourceId && data.name && !seenIds.has(data._sourceId) && !seenNames.has(data.name.toLowerCase())) {
      seenIds.add(data._sourceId);
      seenNames.add(data.name.toLowerCase());
      results.push(data);
    }
  });

  // 2. Identify the single active place details pane if one is open
  // h1.DUwDvf is the unique H1 element exclusively reserved for an opened place title
  const activeDetailTitle = doc.querySelector('h1.DUwDvf');
  const activeDetailPane = activeDetailTitle?.closest('.TI60gf, div[role="main"], .m6QErb');

  // 3. Ask Maps / conversational cards
  // Structurally, genuine places in Google Maps chat MUST contain an interactive anchor linking to the place (/maps/place/)
  const placeLinks = doc.querySelectorAll('a[href*="/maps/place"]');
  placeLinks.forEach((linkEl) => {
    // Structural isolation:
    // a) Skip classic search cards (already parsed above)
    if (linkEl.classList.contains('hfpxzc')) return;
    // b) Skip any links inside the active place details pane (that pane represents the single activeLead, not bulk candidates)
    if (activeDetailPane && activeDetailPane.contains(linkEl)) return;

    const data = parseAskMapsCard(linkEl);
    if (data && data._sourceId && data.name && !seenIds.has(data._sourceId) && !seenNames.has(data.name.toLowerCase())) {
      seenIds.add(data._sourceId);
      seenNames.add(data.name.toLowerCase());
      results.push(data);
    }
  });

  return results;
};
