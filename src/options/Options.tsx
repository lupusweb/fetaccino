import { useState, useEffect } from 'react';
import { MessageType, ExtensionResponse } from '../domain/messages';
import { SpreadsheetDestination } from '../domain/destination';
import { DestinationSelector } from '../popup/DestinationSelector';
import '../popup/DestinationSelector.css';

const Options = () => {
  const [destination, setDestination] = useState<SpreadsheetDestination | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    chrome.runtime.sendMessage({ type: MessageType.GET_AUTH_STATUS }, (res) => {
      if (res && res.success) {
        setIsAuthenticated(res.data.isAuthenticated);
        if (res.data.isAuthenticated) {
          loadDestination();
        }
      }
    });
  };

  const loadDestination = () => {
    chrome.runtime.sendMessage({ type: MessageType.GET_DESTINATION }, (res) => {
      if (res && res.success && res.data) {
        const dest = res.data;
        chrome.runtime.sendMessage(
          { type: MessageType.TEST_SHEETS_CONNECTION, payload: { spreadsheetId: dest.spreadsheetId } },
          (testRes) => {
            if (testRes && testRes.success) {
              setDestination(dest);
            } else if (testRes && testRes.error && (testRes.error.includes('404') || testRes.error.includes('NOT_FOUND'))) {
              chrome.storage.sync.remove('currentDestination');
              setDestination(null);
            } else {
              setDestination(dest);
            }
          }
        );
      } else {
        setDestination(null);
      }
    });
  };

  const handleAuth = () => {
    chrome.runtime.sendMessage(
      { type: MessageType.AUTHENTICATE, payload: { interactive: true } },
      (res: ExtensionResponse) => {
        if (res && res.success) {
          checkAuth();
        } else {
          alert('Authentication failed: ' + (res?.error || 'Unknown error'));
        }
      }
    );
  };

  const handleDisconnect = () => {
    // Chrome identity API handles disconnecting mostly by revoking the token or clearing the cache.
    // For simplicity, we can just log out or instruct the user to remove access in Google Account.
    // We'll clear the cached token if possible.
    chrome.identity.getAuthToken({ interactive: false }, function(token) {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          setIsAuthenticated(false);
        });
      } else {
        setIsAuthenticated(false);
      }
    });
  };

  const onDestinationSelected = (dest: SpreadsheetDestination) => {
    chrome.runtime.sendMessage(
      { type: MessageType.SET_DESTINATION, payload: { destination: dest } },
      () => {
        setDestination(dest);
        setShowSelector(false);
      }
    );
  };

  return (
    <div className="options-container">
      <h1>Fetaccino Settings</h1>
      
      {!isAuthenticated ? (
        <div className="settings-card">
          <h2>Google Account</h2>
          <p className="description">Connect your Google account to save leads directly to Google Sheets.</p>
          <button onClick={handleAuth} className="primary-btn">Connect Google Account</button>
        </div>
      ) : (
        <>
          <div className="settings-card">
            <h2>Destination</h2>
            <p className="description">Choose where Fetaccino will save your extracted leads.</p>

            {showSelector ? (
              <div style={{ border: '1px solid #dadce0', borderRadius: '8px', overflow: 'hidden' }}>
                <DestinationSelector 
                  onSelected={onDestinationSelected} 
                  onCancel={() => setShowSelector(false)} 
                  showCancel={!!destination}
                />
              </div>
            ) : destination ? (
              <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#5f6368', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Current Spreadsheet</div>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: '#202124' }}>{destination.spreadsheetName}</div>
                  <div style={{ fontSize: '13px', color: '#5f6368', marginTop: '4px' }}>Worksheet: {destination.sheetName}</div>
                </div>
                <button onClick={() => setShowSelector(true)} className="secondary-btn">Change destination</button>
              </div>
            ) : (
              <button onClick={() => setShowSelector(true)} className="primary-btn">Choose Destination</button>
            )}
          </div>

          <div className="settings-card" style={{ marginTop: '24px' }}>
            <h2>Google Account</h2>
            <p className="description">You are connected to Google.</p>
            <button onClick={handleDisconnect} className="secondary-btn">Disconnect</button>
          </div>
        </>
      )}
    </div>
  );
};

export default Options;
