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
