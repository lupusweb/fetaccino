import { parseSingleCard } from './parsers/maps';
import { MessageType } from '../domain/messages';
import { QueueItem } from '../domain/business';
import { PageSource } from '../domain/business';
import { analyzeCurrentPage } from './detector';

let currentQueue: Set<string> = new Set();

export const initUI = () => {
  // Listen for storage changes to keep checkbox states synced
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.candidateQueue) {
      const queue: QueueItem[] = changes.candidateQueue.newValue || [];
      currentQueue = new Set(queue.map(q => q.id));
      updateCheckboxes();
    }
  });

  // Initial load
  chrome.storage.local.get(['candidateQueue'], (res) => {
    const queue: QueueItem[] = res.candidateQueue || [];
    currentQueue = new Set(queue.map(q => q.id));
    injectSelectionUI();
  });
};

export const injectSelectionUI = () => {
  const context = analyzeCurrentPage(window.location.href);
  if (context.source !== PageSource.MAPS) return; // Only support Maps for now

  const cards = document.querySelectorAll('a.hfpxzc');
  cards.forEach(card => {
    // If we already injected, skip
    if (card.parentElement?.querySelector('.fetaccino-overlay')) {
      return;
    }

    const businessData = parseSingleCard(card);
    if (!businessData || !businessData._sourceId) return;

    const overlay = document.createElement('div');
    overlay.className = 'fetaccino-overlay';
    overlay.dataset.sourceId = businessData._sourceId;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'fetaccino-checkbox';
    checkbox.checked = currentQueue.has(businessData._sourceId);
    
    // Prevent click from navigating the map card
    overlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const isChecked = !checkbox.checked;
      checkbox.checked = isChecked;

      if (isChecked) {
        chrome.runtime.sendMessage({
          type: MessageType.ADD_TO_QUEUE,
          payload: { businessData }
        });
      } else {
        chrome.runtime.sendMessage({
          type: MessageType.REMOVE_FROM_QUEUE,
          payload: { sourceId: businessData._sourceId }
        });
      }
    });

    overlay.appendChild(checkbox);
    card.parentElement?.appendChild(overlay);
  });
  
  updateCheckboxes();
};

export const updateCheckboxes = () => {
  const overlays = document.querySelectorAll('.fetaccino-overlay');
  overlays.forEach(overlay => {
    const sourceId = (overlay as HTMLElement).dataset.sourceId;
    const checkbox = overlay.querySelector('input');
    if (sourceId && checkbox) {
      checkbox.checked = currentQueue.has(sourceId);
      if (checkbox.checked) {
        overlay.classList.add('selected');
      } else {
        overlay.classList.remove('selected');
      }
    }
  });
};
