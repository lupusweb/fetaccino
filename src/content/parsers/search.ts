import { BusinessData, PageSource } from '../../domain/business';
import { 
  normalizeText, 
  normalizePhone, 
  normalizeRating, 
  normalizeReviewCount, 
  normalizeUrl,
  calculateConfidence 
} from './normalizer';

export const parseSearchPage = (doc: Document, url: string): BusinessData => {
  const data: Partial<BusinessData> = {
    source: PageSource.SEARCH,
    capturedAt: new Date().toISOString(),
  };

  try {
    const urlObj = new URL(url);
    data.searchQuery = urlObj.searchParams.get('q') || undefined;
  } catch (e) {}

  const kp = doc.querySelector('[data-attrid="kp-page-block-local-business"]') 
          || doc.querySelector('#rhs .kp-wholepage')
          || doc.querySelector('.O8T7bf');

  if (!kp) {
    data.confidenceScore = 0;
    return data as BusinessData;
  }

  const nameEl = kp.querySelector('h2[data-attrid="title"]') 
              || kp.querySelector('.SPZz6b h2 span') 
              || kp.querySelector('h2');
  data.name = normalizeText(nameEl?.textContent);

  const ratingEl = kp.querySelector('span.Aq14fc') || kp.querySelector('span[aria-label*="stars"]');
  data.rating = normalizeRating(ratingEl?.textContent || ratingEl?.getAttribute('aria-label'));

  const reviewEl = kp.querySelector('a.hqzQac span') || kp.querySelector('span.Ob2kfd');
  data.reviewCount = normalizeReviewCount(reviewEl?.textContent);

  const addressEl = kp.querySelector('span.LrzXr') || kp.querySelector('[data-attrid="kc:/location/location:address"] span:last-child');
  data.address = normalizeText(addressEl?.textContent);

  const phoneEl = kp.querySelector('span.LrzXr.zdqRlf') || kp.querySelector('[data-attrid="kc:/collection/knowledge_panels/has_phone:phone"] span:last-child');
  data.phone = normalizePhone(phoneEl?.textContent);

  const websiteEl = kp.querySelector('a.ab_button[href^="http"]') as HTMLAnchorElement;
  if (websiteEl) {
    data.website = normalizeUrl(websiteEl.href);
  }

  const directionsEl = kp.querySelector('a.ab_button[href*="maps/dir"]') as HTMLAnchorElement;
  if (directionsEl) {
    data.mapsUrl = normalizeUrl(directionsEl.href);
  } else if (data.name && data.address) {
    data.mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.name + ' ' + data.address)}`;
  }

  const categoryEl = kp.querySelector('span.YhemCb') || kp.querySelector('[data-attrid="kc:/local:category"] span');
  data.category = normalizeText(categoryEl?.textContent);

  data.confidenceScore = calculateConfidence(data);

  return data as BusinessData;
};
