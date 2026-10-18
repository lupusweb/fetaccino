import { describe, it, expect } from 'vitest';
import { detectPageSource } from './detector';
import { PageSource } from '../domain/business';

describe('Page Detector - URL Parsing', () => {
  it('should detect Google Maps URLs', () => {
    expect(detectPageSource('https://www.google.com/maps/place/Some+Business/@40.7128,-74.0060,15z')).toBe(PageSource.MAPS);
    expect(detectPageSource('https://www.google.no/maps/search/restaurants/')).toBe(PageSource.MAPS);
  });

  it('should detect Google Search URLs', () => {
    expect(detectPageSource('https://www.google.com/search?q=plumber+near+me')).toBe(PageSource.SEARCH);
    expect(detectPageSource('https://www.google.co.uk/search?q=tesco')).toBe(PageSource.SEARCH);
  });

  it('should handle root search URL (sometimes used on mobile or redirects)', () => {
    expect(detectPageSource('https://www.google.com/?q=test')).toBe(PageSource.SEARCH);
  });

  it('should return UNKNOWN for unsupported Google URLs', () => {
    expect(detectPageSource('https://mail.google.com/mail/u/0/')).toBe(PageSource.UNKNOWN);
    expect(detectPageSource('https://drive.google.com/drive/my-drive')).toBe(PageSource.UNKNOWN);
    expect(detectPageSource('https://www.google.com/')).toBe(PageSource.UNKNOWN); // No 'q' parameter
  });

  it('should handle invalid URLs gracefully', () => {
    expect(detectPageSource('not a url')).toBe(PageSource.UNKNOWN);
  });
});
