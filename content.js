const DEFAULT_COLUMNS = 4;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 8;
const STYLE_ID = "yt-grid-columns-controller-style";
const FULL_WIDTH_CLASS = "yt-grid-columns-controller-full-width";
const HIDE_SHORTS_CLASS = "yt-grid-columns-controller-hide-shorts";

let gridObserver = null;
let rootObserver = null;
let currentColumns = DEFAULT_COLUMNS;

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

function applyColumns(columns) {
  const safeColumns = clampColumns(columns);
  currentColumns = safeColumns;
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
  `;

  markSpecialItems();
  ensureGridObserver();
}

function isFullWidthItem(item) {
  return Boolean(item.querySelector("ytd-rich-shelf-renderer, ytd-reel-shelf-renderer, ytd-statement-banner-renderer"));
}

function isShortsItem(item) {
  if (!item) return false;
  const tagName = item.tagName?.toLowerCase();

  if (tagName === "ytd-rich-section-renderer") {
    const shelfTitle = item
      .querySelector(":scope > #content > ytd-rich-shelf-renderer #title")
      ?.textContent?.trim()
      ?.toLowerCase();
    const isNewsShelf = Boolean(
      shelfTitle &&
        ["?댁뒪 ?띾낫", "breaking news", "top news", "news", "?뗣깷?쇈궧?잌젿", "?잌젿?뗣깷?쇈궧"].some((keyword) =>
          shelfTitle.includes(keyword)
        )
    );

    return Boolean(
      item.querySelector(
        ":scope > #content > ytd-rich-shelf-renderer[is-shorts], :scope > #content > ytd-chips-shelf-with-video-shelf-renderer"
      ) || isNewsShelf
    );
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

function markSpecialItems() {
  const container = document.querySelector("ytd-rich-grid-renderer #contents.ytd-rich-grid-renderer");
  if (!container) return;

  const children = Array.from(container.children);
  for (const child of children) {
    const shorts = isShortsItem(child);
    child.classList.toggle(HIDE_SHORTS_CLASS, shorts);
    if (shorts) {
      child.style.setProperty("display", "none", "important");
    } else {
      child.style.removeProperty("display");
    }
  }

  const items = children.filter((node) => node.tagName && node.tagName.toLowerCase() === "ytd-rich-item-renderer");
  for (const item of items) {
    if (item.classList.contains(HIDE_SHORTS_CLASS)) {
      item.classList.remove(FULL_WIDTH_CLASS);
      continue;
    }
    item.classList.toggle(FULL_WIDTH_CLASS, isFullWidthItem(item));
  }
}

function ensureGridObserver() {
  const container = document.querySelector("ytd-rich-grid-renderer #contents.ytd-rich-grid-renderer");
  if (!container) return;

  if (gridObserver) {
    gridObserver.disconnect();
  }

  gridObserver = new MutationObserver(() => {
    markSpecialItems();
  });

  gridObserver.observe(container, {
    childList: true,
    subtree: true
  });
}

function ensureRootObserver() {
  if (rootObserver) return;

  rootObserver = new MutationObserver(() => {
    markSpecialItems();
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
  applyColumns(result.youtubeColumns);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "set_columns") return;

  try {
    applyColumns(message.columns);
    sendResponse({ ok: true, columns: currentColumns });
  } catch (error) {
    sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }

  return true;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (!changes.youtubeColumns) return;
  applyColumns(changes.youtubeColumns.newValue);
});

document.addEventListener("yt-navigate-finish", () => {
  applyColumns(currentColumns);
});

ensureRootObserver();
loadAndApply().catch(() => {
  applyColumns(DEFAULT_COLUMNS);
});


