const DEFAULT_COLUMNS = 4;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 8;
const STYLE_ID = "yt-grid-columns-controller-style";
const FULL_WIDTH_CLASS = "yt-grid-columns-controller-full-width";
const HIDE_SHORTS_CLASS = "yt-grid-columns-controller-hide-shorts";
const HIDE_ADS_CLASS = "yt-grid-columns-controller-hide-ads";

let gridObserver = null;
let rootObserver = null;
let currentColumns = DEFAULT_COLUMNS;
let applyRetryTimers = [];
let markSpecialItemsFrame = 0;
let navigationInProgress = false;

function parseRgbColor(value) {
  if (!value) return null;
  const match = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return null;

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  if (![r, g, b].every((n) => Number.isFinite(n))) return null;
  return { r, g, b };
}

function relativeLuminance({ r, g, b }) {
  const toLinear = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function detectYouTubeTheme() {
  const app = document.querySelector("ytd-app");
  if (app?.hasAttribute("dark")) return "dark";
  if (document.documentElement?.hasAttribute("dark")) return "dark";

  const candidates = [app, document.body, document.documentElement].filter(Boolean);
  for (const node of candidates) {
    const color = parseRgbColor(getComputedStyle(node).backgroundColor);
    if (!color) continue;
    return relativeLuminance(color) < 0.2 ? "dark" : "light";
  }

  return "light";
}

function clampColumns(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_COLUMNS;
  return Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.round(number)));
}

function ensureStyleTag() {
  let styleTag = document.getElementById(STYLE_ID);
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = STYLE_ID;
    document.documentElement.appendChild(styleTag);
  }
  return styleTag;
}

function isSupportedGridRoute() {
  return ["/", "/feed/subscriptions"].includes(window.location.pathname);
}

function clearGridOverrides() {
  const styleTag = document.getElementById(STYLE_ID);
  if (styleTag) {
    styleTag.textContent = "";
  }

  document
    .querySelectorAll(`.${FULL_WIDTH_CLASS}, .${HIDE_SHORTS_CLASS}, .${HIDE_ADS_CLASS}`)
    .forEach((node) => {
      node.classList.remove(FULL_WIDTH_CLASS, HIDE_SHORTS_CLASS, HIDE_ADS_CLASS);
      if (node instanceof HTMLElement) {
        node.style.removeProperty("display");
      }
    });

  if (gridObserver) {
    gridObserver.disconnect();
    gridObserver = null;
  }
}

function clearApplyRetryTimers() {
  for (const timerId of applyRetryTimers) {
    window.clearTimeout(timerId);
  }
  applyRetryTimers = [];
}

function scheduleApplyColumns(columns) {
  clearApplyRetryTimers();

  for (const delay of [0, 200, 1000]) {
    const timerId = window.setTimeout(() => {
      applyColumns(columns);
      applyRetryTimers = applyRetryTimers.filter((id) => id !== timerId);
    }, delay);
    applyRetryTimers.push(timerId);
  }
}

function applyColumns(columns) {
  const safeColumns = clampColumns(columns);
  currentColumns = safeColumns;

  if (!isSupportedGridRoute()) {
    if (!navigationInProgress) {
      clearGridOverrides();
    }
    return;
  }

  const styleTag = ensureStyleTag();

  styleTag.textContent = `
    ytd-rich-grid-renderer {
      --yt-grid-columns-controller-count: ${safeColumns};
      --yt-grid-columns-controller-column-gap: 16px;
      --yt-grid-columns-controller-row-gap: 24px;
    }

    ytd-rich-grid-renderer #contents.ytd-rich-grid-renderer {
      display: grid !important;
      grid-template-columns: repeat(var(--yt-grid-columns-controller-count), minmax(0, 1fr)) !important;
      column-gap: var(--yt-grid-columns-controller-column-gap) !important;
      row-gap: var(--yt-grid-columns-controller-row-gap) !important;
      padding-left: 20px !important;
      padding-right: 30px !important;
      box-sizing: border-box !important;
      align-items: start !important;
    }

    ytd-rich-grid-renderer #contents.ytd-rich-grid-renderer > ytd-rich-item-renderer {
      width: auto !important;
      max-width: none !important;
      min-width: 0 !important;
      grid-column: auto !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    ytd-rich-grid-renderer #contents.ytd-rich-grid-renderer > ytd-rich-item-renderer.${FULL_WIDTH_CLASS} {
      grid-column: 1 / -1 !important;
      width: 100% !important;
      max-width: 100% !important;
    }

    ytd-rich-grid-renderer #contents.ytd-rich-grid-renderer > .${HIDE_SHORTS_CLASS} {
      display: none !important;
    }

    ytd-rich-grid-renderer #contents.ytd-rich-grid-renderer > .${HIDE_ADS_CLASS} {
      display: none !important;
    }
  `;

  scheduleMarkSpecialItems();
    ensureGridObserver();
}

function isFullWidthItem(item) {
  return Boolean(
    item.querySelector("ytd-rich-shelf-renderer, ytd-reel-shelf-renderer, ytd-statement-banner-renderer")
  );
}

function normalizeShelfTitle(value) {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() || "";
}

function isShortsItem(item) {
  if (!item) return false;
  const tagName = item.tagName?.toLowerCase();

  if (tagName === "ytd-rich-section-renderer") {
    const richShelfTitle = normalizeShelfTitle(
      item.querySelector(":scope > #content > ytd-rich-shelf-renderer #title")?.textContent
    );
    const plainShelfTitle = normalizeShelfTitle(
      item.querySelector(":scope > #content > ytd-shelf-renderer #title")?.textContent
    );
    const isNewsShelf = Boolean(
      richShelfTitle &&
        ["\uB274\uC2A4 \uC18D\uBCF4", "\uC18D\uBCF4", "\uB274\uC2A4", "breaking news", "top news", "news", "eilmeldungen", "eilmeldung", "nachrichten", "\u30CB\u30E5\u30FC\u30B9\u901F\u5831", "\u901F\u5831", "\u30CB\u30E5\u30FC\u30B9"].some((keyword) =>
          richShelfTitle.includes(keyword)
        )
    );
    const hasPostShelf = Boolean(
      item.querySelector(":scope > #content > ytd-rich-shelf-renderer ytd-post-renderer")
    );
    const isLatestPostsShelf = Boolean(
      hasPostShelf &&
        [
          "\uCD5C\uC2E0 youtube \uAC8C\uC2DC\uBB3C",
          "latest youtube posts",
          "neueste youtube-beitr\u00e4ge",
          "neueste youtube posts",
          "\u6700\u65B0 youtube \u6295\u7A3F",
          "\u6700\u65B0\u306E youtube \u6295\u7A3F"
        ].some((title) => richShelfTitle.includes(title))
    );
    const isSubscriptionsMetaShelf = Boolean(
      window.location.pathname === "/feed/subscriptions" &&
        [
          "\uCD5C\uC2E0\uC21C",
          "\uAD00\uB828\uC131",
          "\u65B0\u3057\u3044\u9806",
          "\u95A2\u9023\u304C\u5F37\u3044",
          "latest",
          "most relevant",
          "neueste",
          "relevanteste"
        ].includes(plainShelfTitle || richShelfTitle)
    );
    const isShortsShelf = Boolean(
      item.querySelector(
        ":scope > #content > ytd-rich-shelf-renderer[is-shorts], :scope > #content > ytd-chips-shelf-with-video-shelf-renderer, :scope > #content > ytd-rich-shelf-renderer a[href*='/feed/subscriptions/shorts'], :scope > #content > ytd-rich-shelf-renderer a[href*='/shorts/']"
      ) || richShelfTitle === "shorts"
    );

    return Boolean(isShortsShelf || isNewsShelf || isLatestPostsShelf || isSubscriptionsMetaShelf);
  }

  if (tagName === "ytd-rich-item-renderer") {
    return Boolean(
      item.querySelector(
        ":scope ytd-rich-shelf-renderer[is-shorts], :scope ytm-shorts-lockup-view-model-v2, :scope ytm-shorts-lockup-view-model, :scope a[href*='/shorts/']"
      )
    );
  }

  if (item.matches("ytd-reel-shelf-renderer")) return true;
  return false;
}

function isAdItem(item) {
  if (!item) return false;
  return Boolean(
    item.querySelector(
      // Home/feed in-grid ads are typically rendered via ytd-ad-slot-renderer.
      ":scope ytd-ad-slot-renderer, :scope ytd-in-feed-ad-layout-renderer, :scope ytd-display-ad-renderer, :scope ytd-promoted-sparkles-web-renderer"
    )
  );
}

function scheduleMarkSpecialItems() {
  if (markSpecialItemsFrame) return;

  markSpecialItemsFrame = window.requestAnimationFrame(() => {
    markSpecialItemsFrame = 0;
    markSpecialItems();
  });
}

function markSpecialItems() {
  const sectionItems = Array.from(document.querySelectorAll("ytd-rich-section-renderer, ytd-rich-item-renderer, ytd-reel-shelf-renderer"));
  if (!sectionItems.length) return;

  for (const item of sectionItems) {
    const shorts = isShortsItem(item);
    const ad = isAdItem(item);
    item.classList.toggle(HIDE_SHORTS_CLASS, shorts);
    item.classList.toggle(HIDE_ADS_CLASS, ad);

    if (shorts || ad) {
      if (item instanceof HTMLElement) {
        item.style.setProperty("display", "none", "important");
      }
    } else if (item instanceof HTMLElement) {
      item.style.removeProperty("display");
    }
  }

  const richItems = Array.from(document.querySelectorAll("ytd-rich-item-renderer"));
  for (const item of richItems) {
    if (item.classList.contains(HIDE_SHORTS_CLASS) || item.classList.contains(HIDE_ADS_CLASS)) {
      item.classList.remove(FULL_WIDTH_CLASS);
      continue;
    }
    item.classList.toggle(FULL_WIDTH_CLASS, isFullWidthItem(item));
  }
}
function ensureGridObserver() {
  if (!isSupportedGridRoute()) {
    if (!navigationInProgress) {
      clearGridOverrides();
    }
    return;
  }

  const container = document.querySelector("ytd-rich-grid-renderer #contents.ytd-rich-grid-renderer");
  if (!container) return;

  if (gridObserver) {
    gridObserver.disconnect();
  }

  gridObserver = new MutationObserver(() => {
    scheduleMarkSpecialItems();
  });

  gridObserver.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
}

function ensureRootObserver() {
  if (rootObserver) return;

  rootObserver = new MutationObserver(() => {
    if (!isSupportedGridRoute()) {
      if (!navigationInProgress) {
        clearGridOverrides();
      }
      return;
    }

    scheduleMarkSpecialItems();
    ensureGridObserver();
  });

  rootObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function storageGet(defaults) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(defaults, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result);
    });
  });
}

async function loadAndApply() {
  const result = await storageGet({ youtubeColumns: DEFAULT_COLUMNS });
  scheduleApplyColumns(result.youtubeColumns);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message) return;

  if (message.type === "set_columns") {
    try {
      applyColumns(message.columns);
      sendResponse({ ok: true, columns: currentColumns });
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }

  if (message.type === "get_theme") {
    sendResponse({ ok: true, theme: detectYouTubeTheme() });
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (!changes.youtubeColumns) return;
  scheduleApplyColumns(changes.youtubeColumns.newValue);
});

document.addEventListener("yt-navigate-start", () => {
  navigationInProgress = true;
  scheduleMarkSpecialItems();
  scheduleApplyColumns(currentColumns);
});

document.addEventListener("yt-navigate-finish", () => {
  navigationInProgress = false;
  scheduleApplyColumns(currentColumns);
});

ensureRootObserver();
loadAndApply().catch(() => {
  scheduleApplyColumns(DEFAULT_COLUMNS);
});











