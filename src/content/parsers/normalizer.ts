import { BusinessData } from '../../domain/business';

export const normalizeText = (text: string | null | undefined): string | undefined => {
  if (!text) return undefined;
  const cleaned = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : undefined;
};

export const normalizePhone = (phone: string | null | undefined): string | undefined => {
  const text = normalizeText(phone);
  if (!text) return undefined;
  return text.replace(/[^\d\+\-\s\(\)]/g, '').trim();
};

export const normalizeRating = (ratingStr: string | null | undefined): number | undefined => {
  const text = normalizeText(ratingStr);
  if (!text) return undefined;
  const match = text.match(/(\d+[\.,]\d+)/);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }
  return undefined;
};

export const normalizeReviewCount = (reviewStr: string | null | undefined): number | undefined => {
  const text = normalizeText(reviewStr);
  if (!text) return undefined;

  // Handle K (thousand) and M (million) abbreviations e.g. 7.5K, 1.2M
  const kmMatch = text.match(/([\d]+(?:[\.,][\d]+)?)\s*([kmKM])/);
  if (kmMatch) {
    const num = parseFloat(kmMatch[1].replace(',', '.'));
    const multiplier = kmMatch[2].toLowerCase() === 'm' ? 1000000 : 1000;
    return Math.round(num * multiplier);
  }

  const numberStr = text.replace(/[^\d]/g, '');
  const count = parseInt(numberStr, 10);
  return isNaN(count) ? undefined : count;
};

export const normalizeUrl = (url: string | null | undefined): string | undefined => {
  const text = normalizeText(url);
  if (!text) return undefined;
  
  if (text.startsWith('/')) {
    return `https://www.google.com${text}`;
  }
  
  if (!text.startsWith('http')) {
    return `https://${text}`;
  }
  return text;
};

export const calculateConfidence = (data: Partial<BusinessData>): number => {
  if (!data.name || data.name.trim().length < 2) return 0;

  let score = 0;
  let maxScore = 0;

  const weight = (field: any, val: number) => {
    maxScore += val;
    if (field !== undefined && field !== null && field !== '') {
      score += val;
    }
  };

  weight(data.name, 30);
  weight(data.address, 20);
  weight(data.phone, 15);
  weight(data.website, 10);
  weight(data.category, 10);
  weight(data.rating, 5);
  weight(data.reviewCount, 5);
  weight(data.mapsUrl, 5);

  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
};
