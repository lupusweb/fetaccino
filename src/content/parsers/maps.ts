import { BusinessData, PageSource } from '../../domain/business';
import { 
  normalizeText, 
  normalizePhone, 
  normalizeRating, 
  normalizeReviewCount, 
  normalizeUrl,
  calculateConfidence 
} from './normalizer';

export const parseMapsPage = (doc: Document, url: string): BusinessData => {
  const data: Partial<BusinessData> = {
    source: PageSource.MAPS,
    capturedAt: new Date().toISOString(),
    mapsUrl: normalizeUrl(url)
  };

  const nameEl = doc.querySelector('h1.DUwDvf');
  data.name = normalizeText(nameEl?.textContent);

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

  data.confidenceScore = calculateConfidence(data);

  return data as BusinessData;
};

export const parseSingleCard = (card: Element): BusinessData | null => {
  const name = normalizeText(card.getAttribute('aria-label'));
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
      if (text && !text.includes('(') && !text.includes('·') && !text.match(/^[0-9.]/)) {
         data.category = normalizeText(text);
         break;
      }
    }
  }

  data.confidenceScore = calculateConfidence(data);
  return data as BusinessData;
};

export const parseMapsBulk = (doc: Document): BusinessData[] => {
  const results: BusinessData[] = [];
  const cards = doc.querySelectorAll('a.hfpxzc');
  
  cards.forEach((card) => {
    const data = parseSingleCard(card);
    if (data) results.push(data);
  });

  return results;
};
