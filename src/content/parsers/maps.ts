import { BusinessData, PageSource, isBlacklistedBusinessName } from '../../domain/business';
import { 
  normalizeText, 
  normalizePhone, 
  normalizeRating, 
  normalizeReviewCount, 
  normalizeUrl, 
  calculateConfidence 
} from './normalizer';

export const parseMapsPage = (doc: Document | Element, url?: string): BusinessData => {
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const data: Partial<BusinessData> = {
    source: PageSource.MAPS,
    capturedAt: new Date().toISOString(),
    mapsUrl: normalizeUrl(currentUrl)
  };

  const nameEl = doc.querySelector('h1.DUwDvf');
  data.name = normalizeText(nameEl?.textContent);

  if (isBlacklistedBusinessName(data.name)) {
    data.name = undefined;
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

export const parseSingleCard = (card: Element): BusinessData | null => {
  const name = normalizeText(card.getAttribute('aria-label') || card.textContent);
  const href = card.getAttribute('href');
  if (!name || !href || isBlacklistedBusinessName(name)) return null;

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

export const parseAskMapsCard = (card: Element): BusinessData | null => {
  // Title detection for conversational/Ask Maps cards
  const nameEl = card.querySelector('.fontHeadlineSmall')
              || card.querySelector('div[role="heading"]')
              || card.querySelector('h2')
              || card.querySelector('h3')
              || card.querySelector('a[href*="/maps/place"]');

  const name = normalizeText(nameEl?.textContent || nameEl?.getAttribute('aria-label'));
  if (!name || name.length < 2 || isBlacklistedBusinessName(name)) return null;

  // A valid Ask Maps card must have a place link or action buttons or rating
  const linkEl = card.querySelector('a[href*="/maps/place"]') as HTMLAnchorElement;
  const hasActionButtons = !!card.querySelector('button[data-value="Directions"], button[data-value="Save"], button[aria-label*="Directions"], button[aria-label*="Save"], button[jsaction*="directions"]');
  const hasRating = !!card.querySelector('span[aria-label*="stars"], span[aria-label*="rating"]');

  if (!linkEl && !hasActionButtons && !hasRating) {
    return null;
  }

  let rating: number | undefined;
  let reviewCount: number | undefined;
  let category: string | undefined;

  const ratingEl = card.querySelector('span[aria-label*="stars"], span[aria-label*="rating"]');
  if (ratingEl) {
    rating = normalizeRating(ratingEl.getAttribute('aria-label') || ratingEl.textContent);
  }

  // Look for text matching rating & category
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
      if (catPart && catPart.length < 30 && !catPart.includes('Opens') && !catPart.includes('Closed') && !/\d/.test(catPart)) {
        category = normalizeText(catPart);
      }
    }
  }

  let mapsUrl: string | undefined;
  let sourceId = '';
  if (linkEl && linkEl.href) {
    mapsUrl = normalizeUrl(linkEl.href);
    try {
      const urlObj = new URL(linkEl.href);
      sourceId = urlObj.origin + urlObj.pathname;
      sourceId = sourceId.split('/@')[0];
    } catch(e) {}
  }

  if (!sourceId) {
    sourceId = `ask_maps:${name}`;
  }

  const data: Partial<BusinessData> = {
    name,
    rating,
    reviewCount,
    category,
    mapsUrl,
    _sourceId: sourceId,
    source: PageSource.MAPS,
    capturedAt: new Date().toISOString()
  };

  data.confidenceScore = calculateConfidence(data);
  return data.confidenceScore >= 40 ? (data as BusinessData) : null;
};

export const parseMapsBulk = (doc: Document | Element): BusinessData[] => {
  const results: BusinessData[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  // 1. Classic search result cards
  const cards = doc.querySelectorAll('a.hfpxzc');
  cards.forEach((card) => {
    const data = parseSingleCard(card);
    if (data && data._sourceId && data.name && !isBlacklistedBusinessName(data.name) && !seenIds.has(data._sourceId) && !seenNames.has(data.name.toLowerCase())) {
      seenIds.add(data._sourceId);
      seenNames.add(data.name.toLowerCase());
      results.push(data);
    }
  });

  // 2. Identify active place detail panel to prevent parsing its sub-sections (e.g. Menu, Updates by visitors)
  const activeDetailTitle = doc.querySelector('h1.DUwDvf');
  const activeDetailPane = activeDetailTitle?.closest('.TI60gf, div[role="main"], .m6QErb');

  // 3. Ask Maps / conversational cards
  const candidateHeadings = doc.querySelectorAll('.fontHeadlineSmall, div[role="article"] a[href*="/maps/place"]');
  candidateHeadings.forEach((el) => {
    // CRITICAL: Skip any sub-sections inside the opened place details panel!
    if (activeDetailPane && activeDetailPane.contains(el)) {
      return;
    }

    const cardContainer = (el.closest('div[jsaction*="place"]') || el.closest('div[role="article"] > div') || el.parentElement) as HTMLElement;
    if (cardContainer && !cardContainer.querySelector('a.hfpxzc')) {
      const data = parseAskMapsCard(cardContainer);
      if (
        data && 
        data._sourceId && 
        data.name && 
        !isBlacklistedBusinessName(data.name) && 
        !seenIds.has(data._sourceId) &&
        !seenNames.has(data.name.toLowerCase()) &&
        data.confidenceScore >= 40
      ) {
        seenIds.add(data._sourceId);
        seenNames.add(data.name.toLowerCase());
        results.push(data);
      }
    }
  });

  return results;
};
