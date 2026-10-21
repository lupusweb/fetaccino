import { parseSingleCard, parseAskMapsCard, parseMapsPage } from './parsers/maps';
import { parseSingleSearchCard, parseSearchPage } from './parsers/search';
import { MessageType } from '../domain/messages';
import { QueueItem, BusinessData, PageSource } from '../domain/business';
import { analyzeCurrentPage } from './detector';

// Logo URI removed from buttonbase64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAGJElEQVR4AYxWfWjWVRR+7m/JlhOXhEvDr0xdU0sJBRPMyjknzVkwc+lMpymaJjRKU9KSMkP7kgz6c0FEmkagBCGJ0heCoSXWH5V9/1VpYZkzt7fnOffj/b2bgfc9555znvPcc8+9v9/7btnYwTcVxg4KGvzaQTWFWsNqeuU81+PijSXXMK2VWuzzvfGwT6pdU8gKhQLSMN/HDgV+QJUlZrnEpEOsx0wyEedVhp5hRo2ArxlTmXMxIZZ8B31EcJxcSWRAmJQBs/CjpEHVIuxySldby7jiKpTegBOFi2lFRCISoECDaQ/LESANyWDgCbCRaHISgSlnrIweJSR5CsfIrs3SDAygFYVGLZqxfC6pmzQOJ8E0Vif6yvuFJXOmPKwYOHyUNlGoQqok35STYaQncRjYvwpTxtQSUV4EKl0CJaI3qljf8REgjMuQfYaFvONnhZEry5Op6Nm//8KKmXejsqLC8+LMW7XzaR0PoiU+RYC53CNIsHc0kyOTNB+rEgvoWyR35i23oqJPHwzo18/T2VhweGAtlHokzkJCA4QU0agYjRcGgqVsHnYSYgjDcPrTx03AwmkzcOz01/jl99+IUGIyLSSWCqiIs4jvgGOGSmGr9HMSilhKk2Ke2mrSFzTm+iFovb0Orx8+iJcO7IPS0OmVtED1SJaxhXJiDGQK4TgXMQYCvAle6E2khBihsvxqbH6rAwc//wyFbuUJB0MvbQnbBDATGwT0EpJNoQ9YwqF0+Fgv2uiaUXj8yUewcu1STBo/Dk2Tp6J2yDDUT5yMZXWzsXJWI1bNmoOV9Y1YelcD7q9vQD+9E6obi2ovqWLi/gYUXE5J1MY0aFuxEHsOdGDB4mY0NNbhzrkzcM2E4bgwuC/ODHD4tQr4o7ocXaOvRfX0cahb04x57Ytw/vz5cHvcgBvCn8djLMwGcggB6LlFKFzgtDtuQ/v61SgrIx3AyFHDsWjpfDy6YQ22PLcBW5/fhGe2P4GNW9qxpn05mluaMGLkMGxatxWF7m7YprGm9pAflC+hEJ0TYTCjJri5MgJbl8yHFQGHQCldk7xPoPNCJ95/7xBa7lmGU198RYT1OLOcP3UILSaeQdcCxw+jJK7EG37DUL84bKbv/r7d+/Fg68NoblxiOm/OEjTNXICpE+vx2NpN+PH7n1hDC6gUBl50OIs50c+sE9uPE6XYiaPrfNqa5HpHpby2qwNPbdyGY0dPoOxcJ6oL5ahGBYaW98eUUbWYVnszJt04BtA6UwBaKwUHLbeng/A1jFG0tq0PnNHC5CG82bEH44eOwMttq7D5vkVYPXsuVjdIm/BQg9eqvpVhUQ+jhgg5dqRyGX0vzhvwWiCS1KCYsMBau66yP9bf24KBVQNIddBHWRUU4Z2jH+GDk8cFeVWipzLjqFl6/UQgYKImLNYkNdRPXPXA9Hr0KbuKMVfzx0fvxD8XO3H89Dd4eu8bePuTI8xRUh366sw0+rJA5pzzXpxTzI2T75NE4DgJ1kZtu3agdec2LNz5LNpe3YHt7+7Glz//EMgkykvl6WihMN6ZBIz9S6jOVFnJsE6uYLNhYgnzXty/1za68O9FdBW60c1bsEQkKGBxbWA1Ip6vLQ5jvgOcLSCLAqlic0LOYj8JOXPuXDEQoEi25MoF5jTVFUYyRVuwAQFUEQRKlVGsUzDVU/jkPWQcurI0iOuQGymXw8QLIRsQQ0okGPvV+Z/TfPctn7E1SX5etFaax6IvvlSxOFEZF78FDEyUtA7NsUcoXOsvXerCC9teUWg9eudKZ1WgUtIK+ryBEDKw3wCFtrcB1srZs3/iyKGPsbhlFT48/CkZzIlDw6C39MTFtUrm+OZ1wzxeFqDSIlagmGmZ24a1y9fh5IlTgVfMBaDUxLTVYSpaun53Onq/qBk4MQzClSVkwQ5Oht2a0eQBhARrchHFKNEiDMVy0xo5BO0GgPA7QIYLalWiL5C+dippVBiVdfxj0x8tCyLom1ItlZBqQ1kyoHpSYhmZPgaHaighovnEVMSUfsLoS8QTn74z6wBrlBZRYVvA4jArBQ2n/wkZqbAUHAz9fgTkE0qSj5n2vJgVEPwcr4RDCiU05Ln/AQAA//8PwF1nAAAABklEQVQDAJNbEoN1O0Y8AAAAAElFTkSuQmCC';

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

const renderButtonContent = (btn: HTMLElement, isSelected: boolean, _isDetail?: boolean) => {
  const actionLabel = isSelected ? 'Added' : '+ Add';

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
      textEl.textContent = btn.classList.contains('selected') ? 'Added' : '+ Add';
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

  const isSelected = currentQueue.has(businessData._sourceId);
  const isDetail = position === 'detail-action';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `fetaccino-action-btn pos-${position}${isSelected ? ' selected' : ''}`;
  btn.dataset.sourceId = businessData._sourceId;
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
    const isDetail = btn.dataset.isDetail === 'true';
    if (sourceId) {
      const isSelected = currentQueue.has(sourceId);
      const wasSelected = btn.classList.contains('selected');
      if (isSelected !== wasSelected) {
        if (isSelected) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
        renderButtonContent(btn, isSelected, isDetail);
      }
    }
  });
};
