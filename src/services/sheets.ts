import { BusinessData } from '../domain/business';
import { logger } from './logger';

const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

const fetchWithRetry = async (url: string, options: RequestInit, maxRetries: number = 2): Promise<Response> => {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500) {
        throw new Error(`Server Error: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.pow(2, attempt) * 1000;
      logger.warn(`Sheets API fetch failed, retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
  throw new Error('Unreachable');
};


export const appendMultipleBusinessesToSheet = async (
  token: string,
  destination: any,
  dataArray: BusinessData[]
): Promise<void> => {
  if (!dataArray || dataArray.length === 0) return;
  
  const spreadsheetId = typeof destination === 'string' ? destination : destination.spreadsheetId;
  const sheetName = (typeof destination === 'object' && destination.sheetName) ? destination.sheetName : 'Sheet1';
  
  const url = `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;

  const rows = dataArray.map(data => [
    data.name || '',
    data.category || '',
    data.rating || '',
    data.reviewCount || '',
    data.address || '',
    data.phone || '',
    data.website || '',
    data.mapsUrl || '',
    data.capturedAt || new Date().toISOString(),
    data.confidenceScore || '',
    data.source || '',
    data.searchQuery || ''
  ]);

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to append multiple to sheets:', errorText);
      throw new Error(`Sheets API Error: ${response.status} ${response.statusText}`);
    }
    
    logger.info(`Successfully appended ${rows.length} businesses to Google Sheets`);
  } catch (error) {
    logger.error('Exception in appendMultipleBusinessesToSheet:', error);
    throw error;
  }
};

export const testSheetsConnection = async (token: string, spreadsheetId: string): Promise<boolean> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId`;
  
  try {
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to test sheets connection:', errorText);
      throw new Error(`Connection failed: ${response.status} ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    logger.error('Exception in testSheetsConnection:', error);
    throw error;
  }
};


export const filterDuplicates = async (
  token: string,
  destination: any,
  candidates: BusinessData[]
): Promise<{ newLeads: BusinessData[], duplicates: BusinessData[] }> => {
  if (!candidates || candidates.length === 0) {
    return { newLeads: [], duplicates: [] };
  }

  const spreadsheetId = typeof destination === 'string' ? destination : destination.spreadsheetId;
  const sheetName = (typeof destination === 'object' && destination.sheetName) ? destination.sheetName : 'Sheet1';

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:F`;

  try {
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 400) {
        // Range not found, probably sheet is empty
        return { newLeads: candidates, duplicates: [] };
      }
      const errorText = await response.text();
      logger.error('Failed to fetch sheet data for bulk duplicate check:', errorText);
      throw new Error(`Bulk Duplicate Check Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Build sets for O(1) lookups
    const existingNames = new Set<string>();
    const existingPhones = new Set<string>();

    for (const row of rows) {
      const rowName = row[0] || '';
      const rowPhone = row[5] || '';
      
      const normalizedRowName = rowName.toLowerCase().trim();
      if (normalizedRowName) existingNames.add(normalizedRowName);
      
      const normalizedRowPhone = rowPhone.replace(/\D/g, '');
      if (normalizedRowPhone && normalizedRowPhone.length > 5) existingPhones.add(normalizedRowPhone);
    }

    const newLeads: BusinessData[] = [];
    const duplicates: BusinessData[] = [];

    for (const lead of candidates) {
      const normalizedName = (lead.name || '').toLowerCase().trim();
      const normalizedPhone = (lead.phone || '').replace(/\D/g, '');
      
      const isNameDup = normalizedName && existingNames.has(normalizedName);
      const isPhoneDup = normalizedPhone && normalizedPhone.length > 5 && existingPhones.has(normalizedPhone);

      if (isNameDup || isPhoneDup) {
        duplicates.push(lead);
      } else {
        newLeads.push(lead);
        // Add to our sets immediately to catch intra-batch duplicates!
        if (normalizedName) existingNames.add(normalizedName);
        if (normalizedPhone && normalizedPhone.length > 5) existingPhones.add(normalizedPhone);
      }
    }

    return { newLeads, duplicates };
  } catch (error) {
    logger.error('Exception in filterDuplicates:', error);
    throw error;
  }
};

export const searchSpreadsheets = async (token: string, query: string = ''): Promise<any[]> => {
  let q = `mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  if (query) {
    q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
  }
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=recency desc&pageSize=15&fields=files(id,name,modifiedTime)`;
  
  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to search spreadsheets: ${response.status}`);
  }
  
  const data = await response.json();
  return data.files || [];
};

export const getSpreadsheetDetails = async (token: string, spreadsheetId: string): Promise<any> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties(sheetId,title)`;
  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('PERMISSION_DENIED');
    }
    if (response.status === 404) {
      throw new Error('NOT_FOUND');
    }
    throw new Error(`Failed to get spreadsheet details: ${response.status}`);
  }
  
  return await response.json();
};

export const createSpreadsheet = async (token: string, title: string): Promise<any> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets`;
  
  // Setup the initial schema matching our append payload
  const body = {
    properties: { title },
    sheets: [
      {
        properties: { title: 'Leads' },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: [
              { userEnteredValue: { stringValue: 'Business Name' } },
              { userEnteredValue: { stringValue: 'Category' } },
              { userEnteredValue: { stringValue: 'Rating' } },
              { userEnteredValue: { stringValue: 'Review Count' } },
              { userEnteredValue: { stringValue: 'Address' } },
              { userEnteredValue: { stringValue: 'Phone' } },
              { userEnteredValue: { stringValue: 'Website' } },
              { userEnteredValue: { stringValue: 'Google Maps URL' } },
              { userEnteredValue: { stringValue: 'Captured At' } },
              { userEnteredValue: { stringValue: 'Confidence' } },
              { userEnteredValue: { stringValue: 'Source' } },
              { userEnteredValue: { stringValue: 'Search Query' } }
            ]
          }]
        }]
      }
    ]
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Failed to create spreadsheet: ${response.status}`);
  }
  
  const data = await response.json();
  const sheetName = data.sheets && data.sheets.length > 0 ? data.sheets[0].properties.title : 'Leads';
  const sheetId = data.sheets && data.sheets.length > 0 ? data.sheets[0].properties.sheetId : undefined;
  
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetName: data.properties?.title || title,
    sheetId,
    sheetName
  };
};
