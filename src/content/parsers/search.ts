import { BusinessData, PageSource } from '../../domain/business';
import { 
  normalizeText, 
  normalizePhone, 
  normalizeRating, 
  normalizeReviewCount, 
  normalizeUrl,
  calculateConfidence 
} from './normalizer';

const INVALID_HEADINGS = new Set([
  'complementary results',
  'complementary result',
  'web results',
  'search results',
  'people also search for',
  'related searches',
  'about these results',
  'videos',
  'images',
  'maps',
  'updates by visitors',
  'menu & highlights',
  'popular times',
  'photos',
  'reviews',
  'overview',
  'about'
]);

export const parseSearchPage = (doc: Document, url: string): BusinessData => {
  const data: Partial<BusinessData> = {
    source: PageSource.SEARCH,
    capturedAt: new Date().toISOString(),
  };

  try {
    const urlObj = new URL(url);
    data.searchQuery = urlObj.searchParams.get('q') || undefined;
  } catch (e) {}

  // 1. Places tab detail panel heading (span.HjGrCb) or standard KP
  // Only search inside genuine local knowledge panels or place detail panels
  const nameEl = doc.querySelector('span.HjGrCb.lOLudc')
              || doc.querySelector('span.HjGrCb')
              || doc.querySelector('[role="heading"].HjGrCb')
              || doc.querySelector('h2[data-attrid="title"]')
              || doc.querySelector('.SPZz6b h2')
              || doc.querySelector('div[data-attrid="title"]')
              || doc.querySelector('[data-attrid="kp-page-block-local-business"] h2');

  const rawName = normalizeText(nameEl?.textContent);

  if (!rawName || INVALID_HEADINGS.has(rawName.toLowerCase())) {
    data.confidenceScore = 0;
    return data as BusinessData;
  }

  data.name = rawName;

  // Rating
  const ratingEl = doc.querySelector('div.dHX2k')
                || doc.querySelector('span.Aq14fc') 
                || doc.querySelector('span.yi40Hd')
                || doc.querySelector('span[aria-label*="stars"]')
                || doc.querySelector('span[aria-label*="Rated"]');
  
  data.rating = normalizeRating(ratingEl?.textContent || ratingEl?.getAttribute('aria-label'));

  // Reviews
  const reviewEl = doc.querySelector('div.leIgTe')
                || doc.querySelector('[role="text"].leIgTe')
                || doc.querySelector('a.hqzQac span') 
                || doc.querySelector('span.Ob2kfd') 
                || doc.querySelector('span.RDApEe');

  data.reviewCount = normalizeReviewCount(reviewEl?.textContent || reviewEl?.getAttribute('aria-label'));

  // Address
  const addressEl = doc.querySelector('span.LrzXr') 
                 || doc.querySelector('[data-attrid="kc:/location/location:address"] span:last-child')
                 || doc.querySelector('div[data-attrid*="address"]');

  data.address = normalizeText(addressEl?.textContent);

  // Phone
  const phoneEl = doc.querySelector('span.LrzXr.zdqRlf') 
               || doc.querySelector('[data-attrid="kc:/collection/knowledge_panels/has_phone:phone"] span:last-child')
               || doc.querySelector('button[data-phone-number]')
               || doc.querySelector('a[href^="tel:"]');

  data.phone = normalizePhone(phoneEl?.textContent || phoneEl?.getAttribute('data-phone-number') || phoneEl?.getAttribute('href'));

  // Website button
  const websiteEl = doc.querySelector('a[aria-label*="Website"]')
                 || doc.querySelector('a.ab_button[href^="http"]') 
                 || doc.querySelector('a[data-item-id="authority"]');
  if (websiteEl) {
    data.website = normalizeUrl((websiteEl as HTMLAnchorElement).href || websiteEl.getAttribute('href'));
  }

  // Directions / Maps Url
  const directionsEl = doc.querySelector('a[aria-label*="Directions"]')
                    || doc.querySelector('a.ab_button[href*="maps/dir"]') 
                    || doc.querySelector('a[href*="/maps/dir/"]');
  if (directionsEl) {
    data.mapsUrl = normalizeUrl(directionsEl.getAttribute('href') || (directionsEl as HTMLAnchorElement).href);
  } else if (data.name && data.address) {
    data.mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.name + ' ' + data.address)}`;
  }

  // Category
  const categoryEl = doc.querySelector('span.YhemCb') 
                  || doc.querySelector('[data-attrid="kc:/local:category"] span')
                  || doc.querySelector('span.HjGrCb ~ div span');

  data.category = normalizeText(categoryEl?.textContent?.replace(/^[·•s]+/, ''));

  // Reject any card that has no core business attributes (address, phone, website, or category)
  if (!data.address && !data.phone && !data.website && !data.category) {
    data.name = undefined;
    data.confidenceScore = 0;
    return data as BusinessData;
  }

  data._sourceId = data.mapsUrl || `search_kp:${data.name}:${data.address || ''}`;
  data.confidenceScore = calculateConfidence(data);

  return data as BusinessData;
};

export const parseSingleSearchCard = (card: Element): BusinessData | null => {
  // Title detection: div.dbg0pd is the universal Google Local card title selector
  const nameEl = card.querySelector('div.dbg0pd span')
              || card.querySelector('div.dbg0pd') 
              || card.querySelector('div.fontHeadlineSmall')
              || card.querySelector('.OSrXXb')
              || card.querySelector('h3')
              || card.querySelector('h2')
              || card.querySelector('.rllt__details > div:first-child');

  const name = normalizeText(nameEl?.textContent);
  if (!name || name.length < 2) return null;

  // Rating & reviews
  let rating: number | undefined;
  let reviewCount: number | undefined;

  const ratingEl = card.querySelector('span.Y0A0hc')
                || card.querySelector('span[aria-label*="Rated"]')
                || card.querySelector('span.yi40Hd') 
                || card.querySelector('span.z3HNkc') 
                || card.querySelector('span[aria-label*="stars"]')
                || card.querySelector('span[aria-label*="rating"]');

  if (ratingEl) {
    const ariaText = ratingEl.getAttribute('aria-label') || '';
    if (ariaText.includes('Rated')) {
      const match = ariaText.match(/Rated\s+([0-5]\.[0-9]|[0-5])/i);
      if (match) rating = parseFloat(match[1]);
      const revMatch = ariaText.match(/([\d,.]+[KkMm]?)\s+user reviews/i);
      if (revMatch) reviewCount = normalizeReviewCount(revMatch[1]);
    } else {
      rating = normalizeRating(ratingEl.textContent || ariaText);
    }
  }

  if (!reviewCount) {
    const reviewEl = card.querySelector('span.RDApEe') 
                  || card.querySelector('span.BT7q4e');
    if (reviewEl) {
      reviewCount = normalizeReviewCount(reviewEl.textContent);
    } else {
      // Find (16K) style spans
      const allSpans = card.querySelectorAll('span, div');
      for (const sp of allSpans) {
        const text = sp.textContent || '';
        const match = text.match(/\(([\d,.]+[KkMm]?)\)/);
        if (match) {
          reviewCount = normalizeReviewCount(match[1]);
          break;
        }
      }
    }
  }

  // Address and category
  let category: string | undefined;
  let address: string | undefined;

  // Use specific detail rows to avoid pulling all combined text
  const detailLines = card.querySelectorAll('.W4Efsd, .rllt__details > div');
  const candidateLines = detailLines.length > 0 ? Array.from(detailLines) : Array.from(card.children);

  candidateLines.forEach(line => {
    const text = normalizeText(line.textContent);
    if (!text || text === name) return;
    
    // Check for "· Restaurant" or category bullet
    if (!category && (text.includes('·') || text.includes('•') || text.includes('\u00b7') || text.includes('A·') || text.includes('Â·'))) {
      const normalizedLine = text.replace(/Â·|A·/g, '·');
      const parts = normalizedLine.split(/[\u00b7\u2022·•]/);
      // Category is typically after the rating/reviews bullet
      const candidates = parts.length > 1 ? parts.slice(1) : parts;
      for (const part of candidates) {
        const cleaned = normalizeText(part?.replace(/^[·•\s]+/, ''));
        if (
          cleaned && 
          cleaned.length < 35 && 
          !cleaned.includes('Closed') && 
          !cleaned.includes('Open') && 
          !/\d|\(|\)/.test(cleaned) &&
          !cleaned.toLowerCase().includes(name.toLowerCase())
        ) {
          category = cleaned;
          break;
        }
      }
    } else if (!address && (/\d/.test(text) || text.includes(',') || text.includes('Road') || text.includes('St') || text.includes('Ave') || text.includes('Rd') || text.includes('Floor'))) {
      if (!text.toLowerCase().includes(name.toLowerCase())) {
        address = text;
      }
    }
  });

  // Source ID
  let sourceId = card.id || card.getAttribute('data-cid') || card.querySelector('[data-cid]')?.getAttribute('data-cid') || '';
  if (sourceId && !sourceId.startsWith('cid:') && !sourceId.startsWith('pv-')) {
    sourceId = `cid:${sourceId}`;
  }

  let mapsUrl: string | undefined;
  const linkEl = card.querySelector('a[href*="/maps"]') as HTMLAnchorElement 
              || card.querySelector('a.vwVUfa') as HTMLAnchorElement;
  if (linkEl && linkEl.href) {
    mapsUrl = normalizeUrl(linkEl.href);
    if (!sourceId && mapsUrl) sourceId = mapsUrl.split('/@')[0];
  }

  if (!sourceId) {
    sourceId = `search:${name}:${rating || 0}:${address || ''}`;
  }

  const data: Partial<BusinessData> = {
    name,
    rating,
    reviewCount,
    category,
    address,
    mapsUrl,
    _sourceId: sourceId,
    source: PageSource.SEARCH,
    capturedAt: new Date().toISOString()
  };

  data.confidenceScore = calculateConfidence(data);
  return data as BusinessData;
};

export const parseSearchBulk = (doc: Document | Element): BusinessData[] => {
  const results: BusinessData[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  // Find all cards in Google Places tab and normal Search
  const cardSelectors = [
    'div[id^="pv-"]',
    'div[role="button"][id^="pv-"]',
    'div.VkpGBb',
    'div[data-cid]',
    'div.rllt__details',
    'div.u3bW4e',
    'div.cXedhc'
  ];

  const cards = doc.querySelectorAll(cardSelectors.join(', '));
  cards.forEach(card => {
    // Avoid double counting nested elements
    if (card.parentElement?.closest('div[id^="pv-"], div.VkpGBb, div[data-cid]')) {
      return;
    }

    const item = parseSingleSearchCard(card);
    if (item && item.name && item._sourceId && !seenIds.has(item._sourceId) && !seenNames.has(item.name.toLowerCase())) {
      seenIds.add(item._sourceId);
      seenNames.add(item.name.toLowerCase());
      results.push(item);
    }
  });

  // Fallback: If no cards found via containers, find all div.dbg0pd
  if (results.length === 0) {
    const titleElements = doc.querySelectorAll('div.dbg0pd');
    titleElements.forEach(titleEl => {
      const container = (titleEl.closest('div[role="button"]') || titleEl.parentElement?.parentElement || titleEl.parentElement) as HTMLElement;
      if (container) {
        const item = parseSingleSearchCard(container);
        if (item && item.name && item._sourceId && !seenIds.has(item._sourceId) && !seenNames.has(item.name.toLowerCase())) {
          seenIds.add(item._sourceId);
          seenNames.add(item.name.toLowerCase());
          results.push(item);
        }
      }
    });
  }

  return results;
};
