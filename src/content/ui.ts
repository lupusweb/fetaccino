import { parseSingleCard, parseAskMapsCard, parseMapsPage } from './parsers/maps';
import { parseSingleSearchCard, parseSearchPage } from './parsers/search';
import { MessageType } from '../domain/messages';
import { QueueItem, BusinessData, PageSource } from '../domain/business';
import { analyzeCurrentPage } from './detector';

let currentQueueIds: Set<string> = new Set();
let currentQueueNames: Set<string> = new Set();

const normalizeKey = (str?: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

const isLeadSelected = (sourceId?: string, name?: string): boolean => {
  if (sourceId && currentQueueIds.has(sourceId)) return true;
  if (name) {
    const key = normalizeKey(name);
    if (key && key.length > 2 && currentQueueNames.has(key)) return true;
  }
  return false;
};

const syncQueueState = (queue: QueueItem[]) => {
  currentQueueIds = new Set(queue.map(q => q.id));
  currentQueueNames = new Set(
    queue.map(q => normalizeKey(q.business?.name)).filter(Boolean)
  );
};

export const initUI = () => {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.candidateQueue) {
      const queue: QueueItem[] = changes.candidateQueue.newValue || [];
      syncQueueState(queue);
      updateCheckboxes();
    }
  });

  chrome.storage.local.get(['candidateQueue'], (res) => {
    const queue: QueueItem[] = res.candidateQueue || [];
    syncQueueState(queue);
    injectSelectionUI();
  });
};

const renderButtonContent = (btn: HTMLElement, isSelected: boolean, _isDetail?: boolean) => {
  const actionLabel = isSelected ? 'Added' : 'Add';

  btn.innerHTML = `
    <span class="fetaccino-action-text">${actionLabel}</span>
  `;

  btn.onmouseenter = () => {
    if (btn.classList.contains('selected')) {
      const textEl = btn.querySelector('.fetaccino-action-text');
      if (textEl) textEl.textContent = 'Remove';
    }
  };

  btn.onmouseleave = () => {
    const textEl = btn.querySelector('.fetaccino-action-text');
    if (textEl) {
      textEl.textContent = btn.classList.contains('selected') ? 'Added' : 'Add';
    }
  };
};

const attachOverlay = (
  container: HTMLElement, 
  businessData: BusinessData, 
  position: 'top-right' | 'detail-action' = 'top-right'
) => {
  if (!businessData || !businessData._sourceId || !businessData.name) return;

  if (container.querySelector('.fetaccino-action-btn')) {
    return;
  }

  const compStyle = window.getComputedStyle(container);
  if (compStyle.position === 'static' && position !== 'detail-action') {
    container.style.position = 'relative';
  }

  const isSelected = isLeadSelected(businessData._sourceId, businessData.name);
  const isDetail = position === 'detail-action';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `fetaccino-action-btn pos-${position}${isSelected ? ' selected' : ''}`;
  btn.dataset.sourceId = businessData._sourceId;
  btn.dataset.businessName = businessData.name;
  btn.dataset.isDetail = isDetail ? 'true' : 'false';
  btn.title = isSelected ? `Remove "${businessData.name}" from Fetaccino` : `Save "${businessData.name}" with Fetaccino`;

  renderButtonContent(btn, isSelected, isDetail);

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const currentlySelected = btn.classList.contains('selected');
    const newSelected = !currentlySelected;

    if (newSelected) {
      btn.classList.add('selected');
      btn.title = `Remove "${businessData.name}" from Fetaccino`;
      renderButtonContent(btn, true, isDetail);
      chrome.runtime.sendMessage({
        type: MessageType.ADD_TO_QUEUE,
        payload: { businessData }
      });
    } else {
      btn.classList.remove('selected');
      btn.title = `Save "${businessData.name}" with Fetaccino`;
      renderButtonContent(btn, false, isDetail);
      chrome.runtime.sendMessage({
        type: MessageType.REMOVE_FROM_QUEUE,
        payload: { sourceId: businessData._sourceId }
      });
    }
  });

  container.appendChild(btn);
};

export const injectSelectionUI = () => {
  const context = analyzeCurrentPage(window.location.href);
  if (context.source === PageSource.UNKNOWN) return;

  // 1. Google Maps injection
  if (context.source === PageSource.MAPS) {
    // A. Classic search listing cards (a.hfpxzc)
    const classicCards = document.querySelectorAll('a.hfpxzc');
    classicCards.forEach(card => {
      const parent = card.parentElement as HTMLElement;
      if (parent) {
        const businessData = parseSingleCard(card);
        if (businessData) attachOverlay(parent, businessData, 'top-right');
      }
    });

    // B. Active Place Detail Panel (h1.DUwDvf)
    const activePlaceTitle = document.querySelector('h1.DUwDvf') as HTMLElement | null;
    const activePlacePane = activePlaceTitle?.closest('.TI60gf, div[role="main"], .m6QErb') as HTMLElement | null;

    if (activePlaceTitle) {
      const headerContainer = (activePlaceTitle.parentElement || activePlaceTitle) as HTMLElement;
      if (headerContainer && !headerContainer.querySelector('.fetaccino-action-btn')) {
        const businessData = parseMapsPage(document, window.location.href);
        if (businessData && businessData.name) {
          attachOverlay(headerContainer, businessData, 'detail-action');
        }
      }
    }

    // C. Ask Maps / Conversational result cards (only genuine place links a[href*="/maps/place"])
    const placeLinks = document.querySelectorAll('a[href*="/maps/place"]');
    placeLinks.forEach(linkEl => {
      if (linkEl.classList.contains('hfpxzc')) return;
      if (activePlacePane && activePlacePane.contains(linkEl)) return;

      const cardContainer = (linkEl.closest('div[role="article"] > div, div[jsaction*="place"], div[role="listitem"]') || linkEl.parentElement) as HTMLElement;
      if (cardContainer && !cardContainer.querySelector('.fetaccino-action-btn')) {
        const businessData = parseAskMapsCard(linkEl);
        if (businessData && businessData.name) {
          attachOverlay(cardContainer, businessData, 'top-right');
        }
      }
    });
  }

  // 2. Google Search injection
  if (context.source === PageSource.SEARCH) {
    // A. Search Places Tab cards (div[id^="pv-"]) & Local Pack cards (div.VkpGBb)
    const searchCards = document.querySelectorAll('div[id^="pv-"], div.VkpGBb, div[data-cid], div.rllt__details');
    searchCards.forEach(card => {
      if (card.parentElement?.closest('div[id^="pv-"], div.VkpGBb, div[data-cid]')) return;
      const container = card as HTMLElement;
      const businessData = parseSingleSearchCard(container);
      if (businessData) {
        attachOverlay(container, businessData, 'top-right');
      }
    });

    // B. Search Detail Panel (span.HjGrCb or standard KP)
    const detailHeading = document.querySelector('span.HjGrCb, [role="heading"].HjGrCb, h2[data-attrid="title"], .SPZz6b h2, h2.qrShPb');
    if (detailHeading) {
      const panelHeader = (detailHeading.parentElement?.parentElement || detailHeading.parentElement) as HTMLElement;
      if (panelHeader && !panelHeader.querySelector('.fetaccino-action-btn')) {
        const businessData = parseSearchPage(document, window.location.href);
        if (businessData && businessData.name) {
          attachOverlay(panelHeader, businessData, 'detail-action');
        }
      }
    }
  }

  updateCheckboxes();
};

export const updateCheckboxes = () => {
  const buttons = document.querySelectorAll('.fetaccino-action-btn');
  buttons.forEach(btnEl => {
    const btn = btnEl as HTMLElement;
    const sourceId = btn.dataset.sourceId;
    const name = btn.dataset.businessName;
    const isDetail = btn.dataset.isDetail === 'true';
    if (sourceId || name) {
      const isSelected = isLeadSelected(sourceId, name);
      const wasSelected = btn.classList.contains('selected');
      if (isSelected !== wasSelected) {
        if (isSelected) {
          btn.classList.add('selected');
          btn.title = `Remove "${name || 'lead'}" from Fetaccino`;
        } else {
          btn.classList.remove('selected');
          btn.title = `Save "${name || 'lead'}" with Fetaccino`;
        }
        renderButtonContent(btn, isSelected, isDetail);
      }
    }
  });
};
