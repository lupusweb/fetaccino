import { BusinessData } from '../../domain/business';
import { PageSource } from '../../domain/business';
import { parseSearchPage } from './search';
import { parseMapsPage } from './maps';

export const parseBusinessContext = (doc: Document, url: string, source: PageSource): BusinessData | null => {
  if (source === PageSource.SEARCH) {
    return parseSearchPage(doc, url);
  } else if (source === PageSource.MAPS) {
    return parseMapsPage(doc, url);
  }
  return null;
};
