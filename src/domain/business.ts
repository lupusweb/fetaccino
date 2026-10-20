export enum PageSource {
  SEARCH = 'SEARCH',
  MAPS = 'MAPS',
  UNKNOWN = 'UNKNOWN'
}
export interface BusinessData {
  name?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  openingHours?: string;
  searchQuery?: string;
  capturedAt: string;
  source: PageSource;
  confidenceScore: number;
  _sourceId?: string;
  _status?: 'pending' | 'duplicate' | 'saved' | 'failed';
  _errorMsg?: string;
}

export interface QueueItem {
  id: string;
  business: BusinessData;
  status: 'queued' | 'enriching' | 'resolved' | 'ambiguous' | 'saved' | 'failed';
  addedAt: number;
}

export const GOOGLE_SECTION_BLACKLIST = new Set([
  'menu & highlights',
  'menu and highlights',
  'updates by visitors',
  'updates from visitors',
  'popular times',
  'review summary',
  'reviews summary',
  'reviews',
  'questions & answers',
  'questions and answers',
  'people also search for',
  'about this place',
  'about',
  'photos & videos',
  'photos',
  'overview',
  'menu',
  'directory',
  'suggest an edit',
  'claim this business',
  'from the business',
  'web results',
  'similar places',
  'similar restaurants',
  'iconic local favorites',
  'ask maps',
  'things to do',
  'places',
  'tickets',
  'events',
  'more places',
  'results',
  'order food',
  'reserve a table',
  'atmosphere',
  'crowd',
  'amenities',
  'offerings',
  'accessibility',
  'planning',
  'payments'
]);

export const isBlacklistedBusinessName = (name: string | null | undefined): boolean => {
  if (!name) return true;
  const clean = name.toLowerCase().replace(/[^\w\s&]/g, '').trim();
  if (!clean || clean.length < 2) return true;
  return GOOGLE_SECTION_BLACKLIST.has(clean) || GOOGLE_SECTION_BLACKLIST.has(name.toLowerCase().trim());
};
