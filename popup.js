const DEFAULT_COLUMNS = 4;
const valueText = document.getElementById("valueText");
const columnRange = document.getElementById("columnRange");
const applyBtn = document.getElementById("applyBtn");
const statusText = document.getElementById("statusText");

function setStatus(message) {
  statusText.textContent = message;
}

function renderValue(value) {
  valueText.textContent = String(value);
}

function tabsQuery(queryInfo) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(tabs);
    });
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

function storageSet(value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(value, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function tabsSendMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function getActiveYouTubeTabId() {
  const tabs = await tabsQuery({ active: true, currentWindow: true });
  if (!tabs.length) throw new Error("Could not find the active tab.");

  const tab = tabs[0];
  if (!tab.url || !tab.url.includes("youtube.com")) {
    throw new Error("This works only on YouTube tabs.");
  }

  return tab.id;
}

async function loadSavedColumns() {
  const data = await storageGet({ youtubeColumns: DEFAULT_COLUMNS });
  const columns = Number(data.youtubeColumns) || DEFAULT_COLUMNS;
  columnRange.value = String(columns);
  renderValue(columns);
}

columnRange.addEventListener("input", () => {
  renderValue(columnRange.value);
});

applyBtn.addEventListener("click", async () => {
  try {
    const columns = Number(columnRange.value);
    await storageSet({ youtubeColumns: columns });

    const tabId = await getActiveYouTubeTabId();
    const response = await tabsSendMessage(tabId, {
      type: "set_columns",
      columns
    });

    if (response && response.ok === false) {
      throw new Error(response.error || "Failed to apply settings on this page.");
    }

    setStatus("Applied.");
  } catch (error) {
    setStatus(`Failed: ${error.message}`);
  }
});

loadSavedColumns().catch((error) => {
  setStatus(`Init failed: ${error.message}`);
});


