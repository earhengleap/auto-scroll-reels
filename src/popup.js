const toggle = document.getElementById("toggle");
const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");
const toggleState = document.getElementById("toggleState");
let activeTab = null;
const SECURITY = {
  allowedExtensionIds: "__ALLOWED_EXTENSION_IDS__"
};

function parseAllowedExtensionIds() {
  try {
    const parsed = JSON.parse(SECURITY.allowedExtensionIds);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isAuthorizedExtension() {
  const allowedIds = parseAllowedExtensionIds();
  if (allowedIds.length === 0) return true;
  return allowedIds.includes(chrome.runtime.id);
}

function isInstagramTab(tab) {
  return Boolean(tab && tab.url && tab.url.includes("instagram.com"));
}

function updateUi() {
  const isOnInstagram = isInstagramTab(activeTab);

  toggleState.textContent = toggle.checked ? "Enabled" : "Disabled";

  if (isOnInstagram && toggle.checked) {
    statusBadge.textContent = "Active";
    statusBadge.className = "badge ready";
    statusText.textContent =
      "Auto-Advance is enabled for this Instagram tab.";
    return;
  }

  if (isOnInstagram && !toggle.checked) {
    statusBadge.textContent = "Ready";
    statusBadge.className = "badge ready";
    statusText.textContent =
      "Instagram detected. Enable Auto-Advance to move to the next Reel automatically.";
    return;
  }

  statusBadge.textContent = "Not on IG";
  statusBadge.className = "badge notice";
  statusText.textContent =
    "Current tab is not Instagram. Your setting is saved and will apply when you open Instagram Reels.";
}

function getStorageValue(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], (result) => {
      resolve(Boolean(result[key]));
    });
  });
}

function getActiveTab() {
  return chrome.tabs
    .query({
      active: true,
      currentWindow: true
    })
    .then((tabs) => tabs[0] || null);
}

async function init() {
  if (!isAuthorizedExtension()) {
    toggle.disabled = true;
    statusBadge.textContent = "Locked";
    statusBadge.className = "badge notice";
    statusText.textContent =
      "This extension build is not authorized for this runtime ID.";
    toggleState.textContent = "Unavailable";
    return;
  }

  const [savedState, tab] = await Promise.all([
    getStorageValue("igAutoNextEnabled"),
    getActiveTab()
  ]);

  toggle.checked = savedState;
  activeTab = tab;
  updateUi();
}

toggle.addEventListener("change", async () => {
  if (!isAuthorizedExtension()) return;

  const enabled = toggle.checked;

  chrome.storage.sync.set({ igAutoNextEnabled: enabled });
  updateUi();

  const tab = activeTab || (await getActiveTab());

  if (!tab || !tab.id) return;

  if (!tab.url || !tab.url.includes("instagram.com")) return;

  chrome.tabs.sendMessage(
    tab.id,
    {
      type: "IG_AUTO_NEXT_TOGGLE",
      enabled
    },
    () => {
      void chrome.runtime.lastError;
    }
  );
});

void init();
