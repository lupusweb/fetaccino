import { useState, useEffect } from 'react';
import './index.css';
import { MessageType, ExtensionResponse } from '../domain/messages';
import { QueueItem } from '../domain/business';
import { SpreadsheetDestination } from '../domain/destination';
import { DestinationSelector } from './DestinationSelector';

function App() {
  const [status, setStatus] = useState<string>('Loading...');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  
  const [destination, setDestination] = useState<SpreadsheetDestination | null>(null);
  const [showDestinationSelector, setShowDestinationSelector] = useState<boolean>(false);

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
    setStatus('Authenticating...');
    setErrorMsg('');
    chrome.runtime.sendMessage(
      { type: MessageType.AUTHENTICATE, payload: { interactive: true } },
      (res: ExtensionResponse) => {
        if (res && res.success) {
          setIsAuthenticated(true);
          loadDestination();
        } else {
          setStatus('Auth Failed');
          setErrorMsg(res?.error || 'Authentication failed. Did you configure the Client ID in manifest.json?');
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

  const handleRemoveItem = (sourceId: string) => {
    chrome.runtime.sendMessage({ type: MessageType.REMOVE_FROM_QUEUE, payload: { sourceId } }, () => {
      fetchQueue(); // Optimistic update is handled by storage listener
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

  // Views
  if (!isAuthenticated) {
    return (
      <div className="popup-container">
        <header className="popup-header">
          <h2>Fetaccino</h2>
        </header>
        <div className="onboarding-box">
          <h3>Welcome to Fetaccino</h3>
          <p>Capture business information from Google Maps and send it directly to your spreadsheet.</p>
          <button onClick={handleAuth} className="save-btn" style={{ width: '100%', marginTop: '16px' }}>
            Connect Google Account
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
            <p>Select checkboxes in Google Maps to add businesses to your list.</p>
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
