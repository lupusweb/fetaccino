import { parseSingleCard, parseAskMapsCard, parseMapsPage } from './parsers/maps';
import { parseSingleSearchCard, parseSearchPage } from './parsers/search';
import { MessageType } from '../domain/messages';
import { QueueItem, BusinessData, PageSource } from '../domain/business';
import { analyzeCurrentPage } from './detector';

let currentQueue: Set<string> = new Set();

export const initUI = () => {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.candidateQueue) {
      const queue: QueueItem[] = changes.candidateQueue.newValue || [];
      currentQueue = new Set(queue.map(q => q.id));
      updateCheckboxes();
    }
  });

  chrome.storage.local.get(['candidateQueue'], (res) => {
    const queue: QueueItem[] = res.candidateQueue || [];
    currentQueue = new Set(queue.map(q => q.id));
    injectSelectionUI();
  });
};

const attachOverlay = (container: HTMLElement, businessData: BusinessData, position: 'top-left' | 'top-right' | 'inline' = 'top-left') => {
  if (!businessData || !businessData._sourceId || !businessData.name) return;

  if (container.querySelector('.fetaccino-overlay')) {
    return;
  }

  const compStyle = window.getComputedStyle(container);
  if (compStyle.position === 'static') {
    container.style.position = 'relative';
  }

  const overlay = document.createElement('div');
  overlay.className = `fetaccino-overlay pos-${position}`;
  overlay.dataset.sourceId = businessData._sourceId;
  overlay.title = `Add "${businessData.name}" to Fetaccino`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'fetaccino-checkbox';
  checkbox.checked = currentQueue.has(businessData._sourceId);

  overlay.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isChecked = !checkbox.checked;
    checkbox.checked = isChecked;

    if (isChecked) {
      overlay.classList.add('selected');
      chrome.runtime.sendMessage({
        type: MessageType.ADD_TO_QUEUE,
        payload: { businessData }
      });
    } else {
      overlay.classList.remove('selected');
      chrome.runtime.sendMessage({
        type: MessageType.REMOVE_FROM_QUEUE,
        payload: { sourceId: businessData._sourceId }
      });
    }
  });

  overlay.appendChild(checkbox);
  container.appendChild(overlay);
};

export const injectSelectionUI = () => {
  const context = analyzeCurrentPage(window.location.href);
  if (context.source === PageSource.UNKNOWN) return;

  // 1. Google Maps injection
  if (context.source === PageSource.MAPS) {
    // A. Classic search listing cards
    const classicCards = document.querySelectorAll('a.hfpxzc');
    classicCards.forEach(card => {
      const parent = card.parentElement as HTMLElement;
      if (parent) {
        const businessData = parseSingleCard(card);
        if (businessData) attachOverlay(parent, businessData, 'top-right');
      }
    });

    // B. Ask Maps / AI Chat / Conversational result cards
    const activeDetailTitle = document.querySelector('h1.DUwDvf');
    const activeDetailPane = activeDetailTitle?.closest('.TI60gf, div[role="main"], .m6QErb');

    const askMapsHeadings = document.querySelectorAll('.fontHeadlineSmall, div[role="heading"]');
    askMapsHeadings.forEach(el => {
      // Never attach overlays to sub-sections inside the active place details panel
      if (activeDetailPane && activeDetailPane.contains(el)) return;
      
      const cardContainer = (el.closest('div[jsaction*="place"]') || el.closest('div[role="article"] > div') || el.parentElement) as HTMLElement;
      if (cardContainer && !cardContainer.querySelector('a.hfpxzc')) {
        const businessData = parseAskMapsCard(cardContainer);
        if (businessData && businessData.name && businessData.confidenceScore >= 40) {
          attachOverlay(cardContainer, businessData, 'top-left');
        }
      }
    });

    // C. Active Place Detail Panel (h1.DUwDvf)
    const titleEl = document.querySelector('h1.DUwDvf') as HTMLElement;
    if (titleEl) {
      const headerContainer = (titleEl.parentElement || titleEl) as HTMLElement;
      if (headerContainer && !headerContainer.querySelector('.fetaccino-overlay')) {
        const businessData = parseMapsPage(document, window.location.href);
        if (businessData && businessData.name) {
          attachOverlay(headerContainer, businessData, 'top-right');
        }
      }
    }
  }

  // 2. Google Search injection
  if (context.source === PageSource.SEARCH) {
    // A. Search Places Tab cards (div[id^="pv-"]) & Local Pack cards
    const searchCards = document.querySelectorAll('div[id^="pv-"], div.VkpGBb, div[data-cid], div.rllt__details');
    searchCards.forEach(card => {
      if (card.parentElement?.closest('div[id^="pv-"], div.VkpGBb, div[data-cid]')) return;
      const container = card as HTMLElement;
      const businessData = parseSingleSearchCard(container);
      if (businessData) {
        // Place top-left so it never collides with thumbnail images on the right
        attachOverlay(container, businessData, 'top-left');
      }
    });

    // Fallback: If cards missed, look for div.dbg0pd
    const titleElements = document.querySelectorAll('div.dbg0pd');
    titleElements.forEach(titleEl => {
      const container = (titleEl.closest('div[role="button"]') || titleEl.parentElement?.parentElement || titleEl.parentElement) as HTMLElement;
      if (container && !container.querySelector('.fetaccino-overlay')) {
        const businessData = parseSingleSearchCard(container);
        if (businessData) attachOverlay(container, businessData, 'top-left');
      }
    });

    // B. Search Detail Panel (span.HjGrCb or standard KP)
    const detailHeading = document.querySelector('span.HjGrCb, [role="heading"].HjGrCb, h2[data-attrid="title"], .SPZz6b h2, h2.qrShPb');
    if (detailHeading) {
      const panelHeader = (detailHeading.parentElement?.parentElement || detailHeading.parentElement) as HTMLElement;
      if (panelHeader && !panelHeader.querySelector('.fetaccino-overlay')) {
        const businessData = parseSearchPage(document, window.location.href);
        if (businessData && businessData.name) {
          attachOverlay(panelHeader, businessData, 'top-right');
        }
      }
    }
  }

  updateCheckboxes();
};

export const updateCheckboxes = () => {
  const overlays = document.querySelectorAll('.fetaccino-overlay');
  overlays.forEach(overlay => {
    const sourceId = (overlay as HTMLElement).dataset.sourceId;
    const checkbox = overlay.querySelector('input');
    if (sourceId && checkbox) {
      const isSelected = currentQueue.has(sourceId);
      checkbox.checked = isSelected;
      if (isSelected) {
        overlay.classList.add('selected');
      } else {
        overlay.classList.remove('selected');
      }
    }
  });
};
