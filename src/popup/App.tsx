import { useState, useEffect } from 'react';
import './index.css';
import { MessageType, ExtensionResponse } from '../domain/messages';
import { QueueItem, BusinessData } from '../domain/business';
import { SpreadsheetDestination } from '../domain/destination';
import { DestinationSelector } from './DestinationSelector';

function App() {
  const [status, setStatus] = useState<string>('Loading...');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  
  const [destination, setDestination] = useState<SpreadsheetDestination | null>(null);
  const [showDestinationSelector, setShowDestinationSelector] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Leads detected on current active tab
  const [pageLeads, setPageLeads] = useState<BusinessData[]>([]);
  const [activePageLead, setActivePageLead] = useState<BusinessData | null>(null);

  useEffect(() => {
    // Check auth on load
    chrome.runtime.sendMessage({ type: MessageType.GET_AUTH_STATUS }, (res) => {
      if (res && res.success) {
        setIsAuthenticated(res.data.isAuthenticated);
        if (res.data.isAuthenticated) {
          loadDestination();
        } else {
          setStatus('Ready');
        }
      }
    });
    
    // Initial queue load
    fetchQueue();

    // Fetch leads detected on active page
    fetchPageLeads();

    // Listen for queue changes in storage
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local' && changes.candidateQueue) {
        setQueue(changes.candidateQueue.newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(storageListener);
    
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  const fetchPageLeads = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_LEADS' }, (res) => {
            if (chrome.runtime.lastError) return;
            if (res && res.success && res.data) {
              setPageLeads(res.data.leads || []);
              setActivePageLead(res.data.activeLead || null);
            }
          });
        }
      });
    }
  };

  const fetchQueue = () => {
    chrome.runtime.sendMessage({ type: MessageType.GET_QUEUE }, (res) => {
      if (res && res.success) {
        setQueue(res.data || []);
      }
    });
  };

  const loadDestination = () => {
    chrome.runtime.sendMessage({ type: MessageType.GET_DESTINATION }, (res) => {
      if (res && res.success && res.data) {
        setDestination(res.data);
      }
      setStatus('Ready');
    });
  };

  const handleAuth = () => {
    setIsAuthenticating(true);
    setStatus('Authenticating...');
    setErrorMsg('');
    chrome.runtime.sendMessage(
      { type: MessageType.AUTHENTICATE, payload: { interactive: true } },
      (res: ExtensionResponse) => {
        setIsAuthenticating(false);
        if (chrome.runtime.lastError) {
          setStatus('Auth Failed');
          setErrorMsg(chrome.runtime.lastError.message || 'Failed to connect to background worker.');
          return;
        }
        if (res && res.success) {
          setIsAuthenticated(true);
          loadDestination();
        } else {
          setStatus('Auth Failed');
          setErrorMsg(res?.error || 'Authentication failed. Please verify your OAuth Client ID.');
        }
      }
    );
  };

  const onDestinationSelected = (dest: SpreadsheetDestination) => {
    chrome.runtime.sendMessage(
      { type: MessageType.SET_DESTINATION, payload: { destination: dest } },
      () => {
        setDestination(dest);
        setShowDestinationSelector(false);
      }
    );
  };

  const handleAddLead = (businessData: BusinessData) => {
    chrome.runtime.sendMessage({
      type: MessageType.ADD_TO_QUEUE,
      payload: { businessData }
    }, () => {
      fetchQueue();
    });
  };

  const handleAddAllPageLeads = (leads: BusinessData[]) => {
    const validLeads = leads.filter(l => l.name && (l.confidenceScore || 0) >= 40);
    validLeads.forEach(businessData => {
      chrome.runtime.sendMessage({
        type: MessageType.ADD_TO_QUEUE,
        payload: { businessData }
      });
    });
    setTimeout(fetchQueue, 300);
  };

  const handleRemoveItem = (sourceId: string) => {
    chrome.runtime.sendMessage({ type: MessageType.REMOVE_FROM_QUEUE, payload: { sourceId } }, () => {
      fetchQueue();
    });
  };

  const handleClearQueue = () => {
    if (confirm('Are you sure you want to clear the queue?')) {
      chrome.runtime.sendMessage({ type: MessageType.CLEAR_QUEUE });
    }
  };

  const handleBatchExport = () => {
    setStatus('Exporting...');
    setErrorMsg('');
    chrome.runtime.sendMessage({ type: MessageType.BATCH_SAVE_QUEUE }, (res) => {
       if (res && res.success) {
         const { saved, skipped } = res.data;
         setStatus(skipped > 0 ? `Saved ${saved}, Skipped ${skipped} dupes` : `Saved ${saved} leads!`);
         setTimeout(() => setStatus('Ready'), 4000);
       } else {
         setStatus('Export Failed');
         setErrorMsg(res?.error || 'Failed to export to Google Sheets.');
       }
    });
  };

  // Determine unadded page leads
  const queuedIds = new Set(queue.map(q => q.id));
  const queuedNames = new Set(queue.map(q => (q.business.name || '').toLowerCase()).filter(Boolean));

  const isLeadInQueue = (lead: BusinessData) => {
    if (lead._sourceId && queuedIds.has(lead._sourceId)) return true;
    if (lead.name && queuedNames.has(lead.name.toLowerCase())) return true;
    return false;
  };

  const showActiveLeadCard = activePageLead && !isLeadInQueue(activePageLead) && (activePageLead.confidenceScore || 0) >= 40;
  const unaddedPageLeads = pageLeads.filter(l => !isLeadInQueue(l) && l.name && (l.confidenceScore || 0) >= 40);

  // Views
  if (!isAuthenticated) {
    const extId = typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime.id : '';
    return (
      <div className="popup-container">
        <header className="popup-header">
          <h2>Fetaccino</h2>
          <span className="status-badge">{status}</span>
        </header>
        <div className="onboarding-box">
          <h3>Welcome to Fetaccino</h3>
          <p>Capture business information from Google Maps and send it directly to your spreadsheet.</p>
          
          {errorMsg && (
            <div className="error-box" style={{ marginTop: '14px', textAlign: 'left', wordBreak: 'break-word', fontSize: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>⚠️ Sign-in Failed</div>
              <div>{errorMsg}</div>
              {extId && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#555', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '6px' }}>
                  <strong>Your Chrome Extension ID:</strong>
                  <div style={{ marginTop: '3px' }}>
                    <code style={{ userSelect: 'all', background: '#fff', padding: '2px 5px', borderRadius: '3px', border: '1px solid #ccc', display: 'inline-block' }}>
                      {extId}
                    </code>
                  </div>
                  <div style={{ marginTop: '4px', color: '#777' }}>
                    Make sure this Extension ID is added to your OAuth Client ID in Google Cloud Console.
                  </div>
                </div>
              )}
            </div>
          )}

          <button 
            onClick={handleAuth} 
            className="save-btn" 
            disabled={isAuthenticating}
            style={{ width: '100%', marginTop: '16px' }}
          >
            {isAuthenticating ? 'Connecting to Google...' : 'Connect Google Account'}
          </button>
        </div>
      </div>
    );
  }

  if (showDestinationSelector || !destination) {
    return (
      <div className="popup-container">
        <DestinationSelector 
          onSelected={onDestinationSelected} 
          onCancel={() => setShowDestinationSelector(false)} 
          showCancel={!!destination}
        />
      </div>
    );
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2>Fetaccino</h2>
          <span className="status-badge">{status}</span>
        </div>
        <button 
          onClick={() => chrome.runtime.openOptionsPage()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
          title="Settings"
        >
          ⚙️
        </button>
      </header>

      <div className="destination-banner">
        <div className="dest-banner-left">
          <span className="dest-banner-label">Saving to</span>
          <span className="dest-banner-value" title={destination.spreadsheetName}>
            {destination.spreadsheetName} &middot; {destination.sheetName}
          </span>
        </div>
        <button className="dest-banner-change" onClick={() => setShowDestinationSelector(true)}>
          Change
        </button>
      </div>
      
      {errorMsg && (
        <div className="error-box" style={{ marginTop: '12px', marginBottom: 0 }}>
          {errorMsg}
        </div>
      )}

      {/* Detected on current active tab */}
      {(showActiveLeadCard || unaddedPageLeads.length > 0) && (
        <div className="page-detected-container">
          {showActiveLeadCard && (
            <div className="page-detected-card">
              <div className="page-detected-info">
                <span className="page-detected-tag">📍 Active on Page</span>
                <div className="page-detected-name">{activePageLead.name}</div>
                <div className="page-detected-meta">
                  {activePageLead.rating && <span>⭐ {activePageLead.rating} </span>}
                  {activePageLead.category && <span>&middot; {activePageLead.category}</span>}
                </div>
              </div>
              <button 
                onClick={() => handleAddLead(activePageLead)} 
                className="add-detected-btn"
              >
                + Add
              </button>
            </div>
          )}

          {unaddedPageLeads.length > 0 && (
            <button 
              onClick={() => handleAddAllPageLeads(unaddedPageLeads)} 
              className="add-all-page-btn"
            >
              + Add {unaddedPageLeads.length} visible leads from page
            </button>
          )}
        </div>
      )}

      <div className="queue-container">
        <div className="queue-header">
          <h3 className="queue-title">Review Queue ({queue.length})</h3>
          {queue.length > 0 && (
             <button className="clear-btn" onClick={handleClearQueue}>Clear</button>
          )}
        </div>
        
        {queue.length === 0 ? (
          <div className="info-box">
            <p>Your queue is empty.</p>
            <p>Select checkboxes on Google Maps or Google Search to collect leads.</p>
          </div>
        ) : (
          <div className="queue-list">
            {queue.map(item => (
              <div key={item.id} className="queue-item">
                <div className="queue-item-info">
                  <div className="queue-item-name">{item.business.name}</div>
                  <div className="queue-item-meta">
                    {item.business.rating && <span>⭐ {item.business.rating} </span>}
                    {item.business.category && <span className="queue-item-cat">{item.business.category}</span>}
                  </div>
                </div>
                <button className="queue-item-remove" onClick={() => handleRemoveItem(item.id)} title="Remove">✕</button>
              </div>
            ))}
          </div>
        )}

        <button 
          className="save-btn batch-save-btn" 
          disabled={queue.length === 0 || status === 'Exporting...'}
          onClick={handleBatchExport}
        >
          {status === 'Exporting...' ? 'Exporting...' : `Export ${queue.length} Leads`}
        </button>
      </div>
    </div>
  );
}

export default App;
