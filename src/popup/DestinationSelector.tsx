import { useState, useEffect, FC } from 'react';
import { MessageType, ExtensionResponse } from '../domain/messages';
import { SpreadsheetDestination } from '../domain/destination';
import './DestinationSelector.css';

interface DestinationSelectorProps {
  onSelected: (dest: SpreadsheetDestination) => void;
  onCancel: () => void;
  showCancel: boolean;
}

export const DestinationSelector: FC<DestinationSelectorProps> = ({ onSelected, onCancel, showCancel }) => {
  const [view, setView] = useState<'list' | 'paste' | 'creating' | 'loading_details'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentDestinations, setRecentDestinations] = useState<SpreadsheetDestination[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Load recents
    chrome.runtime.sendMessage({ type: MessageType.GET_RECENT_DESTINATIONS }, (res: ExtensionResponse) => {
      if (res && res.success) {
        setRecentDestinations(res.data);
      }
    });
    // Load initial empty search (recent/all)
    performSearch('');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (view === 'list') {
        performSearch(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, view]);

  const performSearch = (query: string) => {
    setLoadingSearch(true);
    chrome.runtime.sendMessage(
      { type: MessageType.SEARCH_SPREADSHEETS, payload: { query } },
      (res: ExtensionResponse) => {
        setLoadingSearch(false);
        if (res && res.success) {
          setSearchResults(res.data || []);
        }
      }
    );
  };

  const selectSpreadsheet = (id: string, name: string) => {
    setView('loading_details');
    setErrorMsg('');
    chrome.runtime.sendMessage(
      { type: MessageType.GET_SPREADSHEET_DETAILS, payload: { spreadsheetId: id } },
      (res: ExtensionResponse) => {
        if (res && res.success) {
          const details = res.data;
          const firstSheet = details.sheets && details.sheets.length > 0 ? details.sheets[0].properties : null;
          
          if (!firstSheet) {
            setView('list');
            setErrorMsg('Spreadsheet has no worksheets.');
            return;
          }

          onSelected({
            spreadsheetId: details.spreadsheetId,
            spreadsheetName: details.properties?.title || name,
            sheetId: firstSheet.sheetId.toString(),
            sheetName: firstSheet.title
          });
        } else {
          setView('list');
          if (res?.error?.includes('PERMISSION_DENIED')) {
            setErrorMsg('We found the spreadsheet, but your Google account doesn\'t have access to it.');
          } else {
            setErrorMsg('Could not load spreadsheet details. Try again.');
          }
        }
      }
    );
  };

  const handleCreateNew = () => {
    setView('creating');
    setErrorMsg('');
    chrome.runtime.sendMessage(
      { type: MessageType.CREATE_SPREADSHEET, payload: { title: 'Fetaccino Leads' } },
      (res: ExtensionResponse) => {
        if (res && res.success) {
          onSelected(res.data);
        } else {
          setView('list');
          setErrorMsg('Failed to create new spreadsheet. Try again.');
        }
      }
    );
  };

  const handlePasteSubmit = () => {
    if (!pasteUrl) return;
    
    // Simple extraction logic
    let id = pasteUrl;
    let gid: string | undefined;

    try {
      if (pasteUrl.includes('docs.google.com/spreadsheets/d/')) {
        const parts = pasteUrl.split('/d/')[1].split('/');
        id = parts[0];
        
        const urlObj = new URL(pasteUrl);
        if (urlObj.hash.includes('gid=')) {
          gid = urlObj.hash.split('gid=')[1].split('&')[0];
        }
      }
    } catch (e) {
      // Ignored
    }

    if (!id || id.length < 15) {
      setErrorMsg("This doesn't look like a valid Google Sheets link.");
      return;
    }

    setView('loading_details');
    setErrorMsg('');
    
    chrome.runtime.sendMessage(
      { type: MessageType.GET_SPREADSHEET_DETAILS, payload: { spreadsheetId: id } },
      (res: ExtensionResponse) => {
        if (res && res.success) {
          const details = res.data;
          let targetSheet = details.sheets && details.sheets.length > 0 ? details.sheets[0].properties : null;
          
          if (gid) {
            const matched = details.sheets.find((s: any) => s.properties.sheetId.toString() === gid);
            if (matched) {
              targetSheet = matched.properties;
            }
          }

          if (!targetSheet) {
            setView('paste');
            setErrorMsg('Worksheet not found in the spreadsheet.');
            return;
          }

          onSelected({
            spreadsheetId: details.spreadsheetId,
            spreadsheetName: details.properties?.title || 'Imported Spreadsheet',
            sheetId: targetSheet.sheetId.toString(),
            sheetName: targetSheet.title
          });
        } else {
          setView('paste');
          if (res?.error?.includes('PERMISSION_DENIED')) {
            setErrorMsg("We found the spreadsheet, but your Google account doesn't have access to it.");
          } else {
            setErrorMsg("Could not access spreadsheet. Make sure the link is correct.");
          }
        }
      }
    );
  };

  if (view === 'creating' || view === 'loading_details') {
    return (
      <div className="dest-selector-container center-content">
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', color: '#5f6368' }}>
          {view === 'creating' ? 'Creating new spreadsheet...' : 'Verifying spreadsheet...'}
        </p>
      </div>
    );
  }

  if (view === 'paste') {
    return (
      <div className="dest-selector-container">
        <div className="dest-header">
          <button className="icon-btn" onClick={() => { setView('list'); setErrorMsg(''); }}>←</button>
          <h3>Paste Link</h3>
        </div>
        
        {errorMsg && <div className="error-box">{errorMsg}</div>}
        
        <p className="dest-hint">Paste a Google Sheets URL:</p>
        <input 
          className="dest-search" 
          type="text" 
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={pasteUrl}
          onChange={(e) => setPasteUrl(e.target.value)}
        />
        
        <button className="save-btn" style={{ width: '100%', marginTop: '12px' }} onClick={handlePasteSubmit}>
          Use this spreadsheet
        </button>
      </div>
    );
  }

  return (
    <div className="dest-selector-container">
      <div className="dest-header">
        {showCancel && <button className="icon-btn" onClick={onCancel}>←</button>}
        <h3>Where should we save your leads?</h3>
      </div>
      
      {errorMsg && <div className="error-box">{errorMsg}</div>}
      
      <div className="dest-search-container">
        <span className="search-icon">🔍</span>
        <input 
          type="text" 
          className="dest-search"
          placeholder="Search your spreadsheets..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="dest-list">
        {!searchQuery && recentDestinations.length > 0 && (
          <>
            <div className="dest-list-header">Recent</div>
            {recentDestinations.map((d, i) => (
              <div key={`recent-${i}`} className="dest-item" onClick={() => onSelected(d)}>
                <div className="dest-icon">📊</div>
                <div className="dest-details">
                  <div className="dest-name">{d.spreadsheetName}</div>
                  <div className="dest-sub">{d.sheetName}</div>
                </div>
              </div>
            ))}
            <div className="dest-list-header" style={{ marginTop: '12px' }}>All Spreadsheets</div>
          </>
        )}
        
        {loadingSearch ? (
          <div className="dest-loading">🔄 Loading your spreadsheets...</div>
        ) : searchResults.length === 0 ? (
          <div className="dest-empty">No spreadsheets found.</div>
        ) : (
          searchResults.map((s) => (
            <div key={s.id} className="dest-item" onClick={() => selectSpreadsheet(s.id, s.name)}>
              <div className="dest-icon">📊</div>
              <div className="dest-details">
                <div className="dest-name">{s.name}</div>
                <div className="dest-sub">Google Sheet</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="dest-actions">
        <button className="dest-action-btn" onClick={handleCreateNew}>
          + Create new spreadsheet
        </button>
        <div className="dest-or">or</div>
        <button className="dest-action-btn secondary" onClick={() => { setView('paste'); setErrorMsg(''); }}>
          Paste a Google Sheets link
        </button>
      </div>
    </div>
  );
};
