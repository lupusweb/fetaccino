import { logger } from '../services/logger';

export const getAuthToken = (interactive: boolean): Promise<string> => {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        logger.error('Auth error:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError.message);
      } else if (token) {
        resolve(token);
      } else {
        reject('Unknown auth error');
      }
    });
  });
};

export const revokeAuthToken = (token: string): Promise<void> => {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      resolve();
    });
  });
};
