/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { parseSearchPage } from './search';
import { parseMapsPage, parseMapsBulk } from './maps';
import { normalizeRating, normalizePhone, normalizeReviewCount, normalizeUrl } from './normalizer';

describe('Normalizers', () => {
  it('normalizes ratings', () => {
    expect(normalizeRating('4.7')).toBe(4.7);
    expect(normalizeRating('4,7')).toBe(4.7);
    expect(normalizeRating('Rating: 4.5 out of 5')).toBe(4.5);
    expect(normalizeRating(null)).toBeUndefined();
  });

  it('normalizes review counts', () => {
    expect(normalizeReviewCount('1,234 reviews')).toBe(1234);
    expect(normalizeReviewCount('1.234 Google reviews')).toBe(1234);
    expect(normalizeReviewCount('50')).toBe(50);
  });

  it('normalizes phones', () => {
    expect(normalizePhone('+47 123 45 678')).toBe('+47 123 45 678');
    expect(normalizePhone('123-456-7890')).toBe('123-456-7890');
    expect(normalizePhone('(555) 123-4567')).toBe('(555) 123-4567');
  });
  
  it('normalizes urls', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });
});

describe('Parsers with JSDOM', () => {
  it('parses Google Search Knowledge Panel', () => {
    document.body.innerHTML = `
      <div data-attrid="kp-page-block-local-business">
        <h2 data-attrid="title">Test Business LLC</h2>
        <span class="Aq14fc">4.8</span>
        <a class="hqzQac"><span>120 Google reviews</span></a>
        <span class="YhemCb">Law Firm</span>
        <span class="LrzXr">123 Test St, City, ST 12345</span>
        <span class="LrzXr zdqRlf">+1 555-123-4567</span>
        <a class="ab_button" href="http://testbusiness.com">Website</a>
      </div>
    `;

    const result = parseSearchPage(document, 'https://www.google.com/search?q=test');
    expect(result.name).toBe('Test Business LLC');
    expect(result.rating).toBe(4.8);
    expect(result.reviewCount).toBe(120);
    expect(result.category).toBe('Law Firm');
    expect(result.address).toBe('123 Test St, City, ST 12345');
    expect(result.phone).toBe('+1 555-123-4567');
    expect(result.website).toBe('http://testbusiness.com/');
    expect(result.confidenceScore).toBeGreaterThan(80);
  });

  it('parses Google Maps Sidebar', () => {
    document.body.innerHTML = `
      <div>
        <h1 class="DUwDvf">Maps Business Inc</h1>
        <div class="F7nice">
          <span aria-hidden="true">4.2</span>
          <span aria-label="50 reviews">50</span>
        </div>
        <button class="DkEaL">Plumber</button>
        <button data-item-id="address"><div class="Io6YTe">456 Maps Ave</div></button>
        <button data-item-id="phone:tel:+1234567890"><div class="Io6YTe">+1 234-567-890</div></button>
        <a data-item-id="authority" href="https://mapsbusiness.com">Website</a>
      </div>
    `;

    const result = parseMapsPage(document, 'https://www.google.com/maps/place/test');
    expect(result.name).toBe('Maps Business Inc');
    expect(result.rating).toBe(4.2);
    expect(result.reviewCount).toBe(50);
    expect(result.category).toBe('Plumber');
    expect(result.address).toBe('456 Maps Ave');
    expect(result.phone).toBe('+1 234-567-890');
    expect(result.website).toBe('https://mapsbusiness.com');
    expect(result.mapsUrl).toBe('https://www.google.com/maps/place/test');
    expect(result.confidenceScore).toBeGreaterThan(80);
  });

  it('parses Google Maps Bulk Results', () => {
    document.body.innerHTML = `
      <div class="UaQhfb">
        <a class="hfpxzc" aria-label="Plumbing Pros" href="https://www.google.com/maps/place/Plumbing+Pros/@123,456,15z/data=!3m1!4b1"></a>
        <div class="W4Efsd">
          <span aria-label="4.8 stars">4.8</span>
          <span aria-label="1,200 reviews">(1,200)</span>
        </div>
        <div class="W4Efsd">
          <span>Plumber</span>
        </div>
      </div>
      <div class="UaQhfb">
        <a class="hfpxzc" aria-label="FixIt Fast" href="https://www.google.com/maps/place/FixIt+Fast/@123,456,15z"></a>
        <div class="W4Efsd">
          <span class="MW4etd">3.9</span>
          <span aria-label="45 reviews">(45)</span>
        </div>
        <div class="W4Efsd">
          <span>Handyman</span>
        </div>
      </div>
    `;

    const results = parseMapsBulk(document);
    expect(results.length).toBe(2);

    expect(results[0].name).toBe('Plumbing Pros');
    expect(results[0].rating).toBe(4.8);
    expect(results[0].reviewCount).toBe(1200);
    expect(results[0].category).toBe('Plumber');
    expect(results[0]._sourceId).toBe('https://www.google.com/maps/place/Plumbing+Pros');

    expect(results[1].name).toBe('FixIt Fast');
    expect(results[1].rating).toBe(3.9);
    expect(results[1].reviewCount).toBe(45);
    expect(results[1].category).toBe('Handyman');
    expect(results[1]._sourceId).toBe('https://www.google.com/maps/place/FixIt+Fast');
  });
});
