const DEFAULT_THRESHOLD_MINUTES = 60;
const DEFAULT_GLOBAL_ENABLED = true;
const RESTORE_WINDOW_MS = 20000;
const CHECK_ALARM = "tabRotCheck";

const STAGE_FADED = 1;
const STAGE_GRAINY = 2;
const STAGE_CRACKED = 3;

let tab_timestamps = {};
let url_timestamps = {};
let tab_urls = {};
let stateLoadedPromise = null;

function isRestrictedUrl(rawUrl) {
  if (!rawUrl) return true;
  return /^(chrome|edge|about|chrome-extension|moz-extension|devtools|view-source|extension|data|blob|file):/i.test(rawUrl);
}

function normalizeUrl(rawUrl) {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl);
    return url.hostname + url.pathname + url.search;
  } catch {
    return "";
  }
}

function getDecayStage(deltaMs, thresholdMs) {
  if (deltaMs >= thresholdMs * 4) return STAGE_CRACKED;
  if (deltaMs >= thresholdMs * 2) return STAGE_GRAINY;
  if (deltaMs >= thresholdMs) return STAGE_FADED;
  return 0;
}

function ensureStateLoaded() {
  if (!stateLoadedPromise) {
    stateLoadedPromise = (async () => {
      const local = await chrome.storage.local.get(["tab_timestamps", "url_timestamps", "tab_urls"]);
      tab_timestamps = local.tab_timestamps || {};
      url_timestamps = local.url_timestamps || {};
      tab_urls = local.tab_urls || {};
    })();
  }
  return stateLoadedPromise;
}

function saveTabTimestamps() {
  chrome.storage.local.set({ tab_timestamps });
}

function saveUrlTimestamps() {
  chrome.storage.local.set({ url_timestamps });
}

function saveTabUrls() {
  chrome.storage.local.set({ tab_urls });
}

function addUrlTime(url, time) {
  if (!url) return;
  if (!Array.isArray(url_timestamps[url])) {
    url_timestamps[url] = [];
  }
  url_timestamps[url].push(time);
}

function popOldestUrlTime(url) {
  const list = url_timestamps[url];
  if (!Array.isArray(list) || list.length === 0) return null;
  let minIndex = 0;
  for (let i = 1; i < list.length; i++) {
    if (list[i] < list[minIndex]) minIndex = i;
  }
  const val = list.splice(minIndex, 1)[0];
  if (list.length === 0) delete url_timestamps[url];
  return val;
}

function replaceUrlTime(url, oldTime, newTime) {
  if (!url) return;
  const list = url_timestamps[url];
  if (!Array.isArray(list)) {
    addUrlTime(url, newTime);
    return;
  }
  const index = list.indexOf(oldTime);
  if (index >= 0) {
    list[index] = newTime;
  } else {
    list.push(newTime);
  }
}

function removeUrlTime(url, time) {
  if (!url) return;
  const list = url_timestamps[url];
  if (!Array.isArray(list)) return;
  const index = list.indexOf(time);
  if (index >= 0) list.splice(index, 1);
  if (list.length === 0) delete url_timestamps[url];
}

function recordVisit(tabId, rawUrl, time = Date.now()) {
  if (!tabId || tabId === chrome.tabs.TAB_ID_NONE) return;
  if (isRestrictedUrl(rawUrl)) {
    delete tab_timestamps[tabId];
    delete tab_urls[tabId];
    saveTabTimestamps();
    saveTabUrls();
    return;
  }
  const url = normalizeUrl(rawUrl);
  const previousTime = tab_timestamps[tabId];
  tab_timestamps[tabId] = time;
  if (previousTime !== undefined) {
    replaceUrlTime(url, previousTime, time);
  } else {
    addUrlTime(url, time);
  }
  tab_urls[tabId] = url;
  saveTabTimestamps();
  saveUrlTimestamps();
  saveTabUrls();
}

function getStageForTab(tabId, thresholdMs) {
  const lastVisited = tab_timestamps[tabId];
  if (lastVisited === undefined) return 0;
  return getDecayStage(Date.now() - lastVisited, thresholdMs);
}

function sendTabMessage(tabId, message) {
  chrome.tabs.sendMessage(tabId, message, () => {
    void chrome.runtime.lastError;
  });
}

async function getThresholdMs() {
  const stored = await chrome.storage.local.get(["decay_threshold_minutes"]);
  return (Number(stored.decay_threshold_minutes) || DEFAULT_THRESHOLD_MINUTES) * 60 * 1000;
}

async function checkTabs() {
  await ensureStateLoaded();
  const stored = await chrome.storage.local.get(["decay_threshold_minutes", "global_enabled"]);
  const thresholdMs = (Number(stored.decay_threshold_minutes) || DEFAULT_THRESHOLD_MINUTES) * 60 * 1000;
  const enabled = stored.global_enabled !== false;

  let tabs;
  try {
    tabs = await chrome.tabs.query({});
  } catch {
    return;
  }

  const currentTabIds = new Set();

  for (const tab of tabs) {
    const tabId = tab.id;
    if (!tabId || tabId === chrome.tabs.TAB_ID_NONE) continue;
    currentTabIds.add(tabId);
    if (isRestrictedUrl(tab.url)) continue;

    const url = normalizeUrl(tab.url);
    if (tab_urls[tabId] === undefined && url) {
      tab_urls[tabId] = url;
    }

    if (tab_timestamps[tabId] === undefined) {
      const restoredTime = popOldestUrlTime(url);
      tab_timestamps[tabId] = restoredTime !== null ? restoredTime : Date.now();
      if (restoredTime === null) addUrlTime(url, tab_timestamps[tabId]);
    }

    const stage = enabled ? getStageForTab(tabId, thresholdMs) : 0;
    sendTabMessage(tabId, { action: "set_rot_stage", stage });
  }

  for (const id of Object.keys(tab_timestamps)) {
    if (!currentTabIds.has(Number(id))) {
      delete tab_timestamps[id];
      delete tab_urls[id];
    }
  }

  saveTabTimestamps();
  saveUrlTimestamps();
  saveTabUrls();
}

function ensureAlarm() {
  try {
    chrome.alarms.create(CHECK_ALARM, { periodInMinutes: 1 });
  } catch {}
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["decay_threshold_minutes", "global_enabled"], (stored) => {
    const patch = {};
    if (stored.decay_threshold_minutes === undefined) {
      patch.decay_threshold_minutes = DEFAULT_THRESHOLD_MINUTES;
    }
    if (stored.global_enabled === undefined) {
      patch.global_enabled = DEFAULT_GLOBAL_ENABLED;
    }
    if (Object.keys(patch).length > 0) {
      chrome.storage.local.set(patch);
    }
  });
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureStateLoaded();
  await chrome.storage.session.set({ startupTimestamp: Date.now() });
  await checkTabs();
});

chrome.tabs.onCreated.addListener(async (tab) => {
  await ensureStateLoaded();
  if (!tab.id || tab.id === chrome.tabs.TAB_ID_NONE) return;
  const rawUrl = tab.pendingUrl || tab.url;
  const url = normalizeUrl(rawUrl);
  if (isRestrictedUrl(rawUrl)) return;

  const sess = await chrome.storage.session.get("startupTimestamp");
  const restored = Boolean(tab.sessionId) || (typeof sess.startupTimestamp === "number" && Date.now() - sess.startupTimestamp < RESTORE_WINDOW_MS);

  if (restored) {
    const restoredTime = popOldestUrlTime(url);
    tab_timestamps[tab.id] = restoredTime !== null ? restoredTime : Date.now();
    if (restoredTime === null) addUrlTime(url, tab_timestamps[tab.id]);
  } else {
    tab_timestamps[tab.id] = Date.now();
    addUrlTime(url, tab_timestamps[tab.id]);
  }

  tab_urls[tab.id] = url;
  saveTabTimestamps();
  saveUrlTimestamps();
  saveTabUrls();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  await ensureStateLoaded();
  if (changeInfo.status !== "complete" || !tab.url) return;
  const url = normalizeUrl(tab.url);
  if (isRestrictedUrl(tab.url)) return;

  const previousUrl = tab_urls[tabId];
  const previousTime = tab_timestamps[tabId];

  if (previousUrl && previousUrl !== url) {
    if (previousTime !== undefined) removeUrlTime(previousUrl, previousTime);
    tab_timestamps[tabId] = Date.now();
    addUrlTime(url, tab_timestamps[tabId]);
    tab_urls[tabId] = url;
    saveTabTimestamps();
    saveUrlTimestamps();
    saveTabUrls();
  } else if (previousUrl === undefined && previousTime === undefined) {
    const restoredTime = popOldestUrlTime(url);
    tab_timestamps[tabId] = restoredTime !== null ? restoredTime : Date.now();
    if (restoredTime === null) addUrlTime(url, tab_timestamps[tabId]);
    tab_urls[tabId] = url;
    saveTabTimestamps();
    saveUrlTimestamps();
    saveTabUrls();
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await ensureStateLoaded();
  const tabId = activeInfo.tabId;
  if (!tabId || tabId === chrome.tabs.TAB_ID_NONE) return;

  const thresholdMs = await getThresholdMs();
  const stage = getStageForTab(tabId, thresholdMs);

  sendTabMessage(tabId, { action: "set_rot_stage", stage });
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await ensureStateLoaded();
  const url = tab_urls[tabId];
  const time = tab_timestamps[tabId];
  if (url && time !== undefined) {
    removeUrlTime(url, time);
  }
  delete tab_timestamps[tabId];
  delete tab_urls[tabId];
  saveTabTimestamps();
  saveUrlTimestamps();
  saveTabUrls();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CHECK_ALARM) {
    await checkTabs();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    await ensureStateLoaded();
    if (message.action === "reset_my_timestamp") {
      if (sender.tab && sender.tab.id) {
        recordVisit(sender.tab.id, sender.tab.url);
      }
      sendResponse({ status: "ok" });
    } else if (message.action === "hello") {
      if (sender.tab && sender.tab.id) {
        const stored = await chrome.storage.local.get(["decay_threshold_minutes", "global_enabled"]);
        const thresholdMs = (Number(stored.decay_threshold_minutes) || DEFAULT_THRESHOLD_MINUTES) * 60 * 1000;
        const stage = stored.global_enabled === false ? 0 : getStageForTab(sender.tab.id, thresholdMs);
        sendResponse({ status: "ok", stage });
        return;
      }
      sendResponse({ status: "ok", stage: 0 });
    } else if (message.action === "settings_updated") {
      await checkTabs();
      sendResponse({ status: "ok" });
    } else if (message.action === "test_decay") {
      await handleTestDecay();
      sendResponse({ status: "ok" });
    } else if (message.action === "reset_all") {
      await handleResetAll();
      sendResponse({ status: "ok" });
    }
  })();
  return true;
});

async function handleTestDecay() {
  await ensureStateLoaded();
  const thresholdMs = await getThresholdMs();
  let tabs;
  try {
    tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    return;
  }
  const tab = tabs[0];
  if (!tab || !tab.id) return;

  const fakeTime = Date.now() - thresholdMs * 4 - 60 * 1000;
  const previousTime = tab_timestamps[tab.id];
  const url = normalizeUrl(tab.url);

  tab_timestamps[tab.id] = fakeTime;
  if (previousTime !== undefined) {
    replaceUrlTime(url, previousTime, fakeTime);
  } else {
    addUrlTime(url, fakeTime);
  }
  tab_urls[tab.id] = url;
  saveTabTimestamps();
  saveUrlTimestamps();
  saveTabUrls();

  sendTabMessage(tab.id, { action: "set_rot_stage", stage: STAGE_CRACKED });
}

async function handleResetAll() {
  await ensureStateLoaded();
  let tabs;
  try {
    tabs = await chrome.tabs.query({});
  } catch {
    return;
  }
  const now = Date.now();
  for (const tab of tabs) {
    if (!tab.id || tab.id === chrome.tabs.TAB_ID_NONE) continue;
    const url = normalizeUrl(tab.url);
    const previousTime = tab_timestamps[tab.id];
    tab_timestamps[tab.id] = now;
    if (previousTime !== undefined) {
      replaceUrlTime(url, previousTime, now);
    } else if (url) {
      addUrlTime(url, now);
    }
    tab_urls[tab.id] = url;
    sendTabMessage(tab.id, { action: "set_rot_stage", stage: 0 });
  }
  saveTabTimestamps();
  saveUrlTimestamps();
  saveTabUrls();
}

(async function init() {
  await ensureStateLoaded();
  ensureAlarm();
  await checkTabs();
})();
