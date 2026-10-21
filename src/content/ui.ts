import { parseSingleCard, parseAskMapsCard, parseMapsPage } from './parsers/maps';
import { parseSingleSearchCard, parseSearchPage } from './parsers/search';
import { MessageType } from '../domain/messages';
import { QueueItem, BusinessData, PageSource } from '../domain/business';
import { analyzeCurrentPage } from './detector';

const FETACCINO_LOGO_URI = 'data:image/webp;base64,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';


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
    <img class="fetaccino-logo-icon" src="${FETACCINO_LOGO_URI}" alt="Fetaccino" width="13" height="13" />
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
