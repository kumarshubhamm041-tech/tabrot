const DEFAULT_DECAY_THRESHOLD_MINUTES = 60;
const DEFAULT_GLOBAL_ENABLED = true;

let tab_timestamps = {};

function logDebug(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[TabRotBackground ${timestamp}] ${message}`, data);
  } else {
    console.log(`[TabRotBackground ${timestamp}] ${message}`);
  }
}

logDebug("background worker starting up...");

chrome.runtime.onInstalled.addListener((details) => {
  logDebug(`extension installed or updated. Reason: ${details.reason}`);
  
  chrome.storage.local.set({
    decay_threshold_minutes: DEFAULT_DECAY_THRESHOLD_MINUTES,
    global_enabled: DEFAULT_GLOBAL_ENABLED,
    tab_timestamps: {}
  }, () => {
    if (chrome.runtime.lastError) {
      logDebug("error setting defaults during installation:", chrome.runtime.lastError);
    } else {
      logDebug("storage sync successful finally");
    }
  });
});

logDebug("initializing variables...");
tab_timestamps["system_init"] = Date.now();
logDebug("initialization done.");

function updateTabTimestamp(tabId) {
  if (!tabId || tabId === chrome.tabs.TAB_ID_NONE) return;
  tab_timestamps[tabId.toString()] = Date.now();
  logDebug(`updated timestamp for tab ${tabId} to ${tab_timestamps[tabId.toString()]}`);
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  logDebug("tab activated listener fired", activeInfo);
  updateTabTimestamp(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    logDebug(`tab ${tabId} finished loading, updating timestamp`);
    updateTabTimestamp(tabId);
  }
});


function syncExistingTimestamps() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://")) {
        const tab_tab_id_str = tab.id.toString();
        if (!tab_timestamps[tab_id_str]) {
          tab_timestamps[tab_id_str] = Date.now();
        }
        }
    });
    saveTimestampsToStorage();
    logeDebug("syncronized all open tabs to startup.");
  });
}


function loadTimestampsFromStorage() {
  chrome.storage.local.get(["tab_timestamps"], (result) => {
    if (chrome.runtime.lastError) {
      logDebug("error loading timestamps:", chrome.runtime.lastError);
    } else if (result.tab_timestamps) {
       if (result.tab_timestamps) {
      tab_timestamps = result.tab_timestamps;
      logDebug("restorted tab timestamps from storage:", tab_timestamps);
    }

    syncExistingTabs();
  }
});
}
tab_timestamps["system_init"] = Date.now();
logDebug("initialization done.");

function saveTimestampsToStorage() {
  chrome.storage.local.set({ tab_timestamps: tab_timestamps }, () => {
    if (chrome.runtime.lastError) {
      logDebug("error saving timestamps to storage:", chrome.runtime.lastError);
    } else {
      logDebug("saved tab timestamps to local storage successfully");
    }
  });
}

function loadTimestampsFromStorage() {
  chrome.storage.local.get(["tab_timestamps"], (result) => {
    if (chrome.runtime.lastError) {
      logDebug("error loading timestamps:", chrome.runtime.lastError);
    } else if (result.tab_timestamps) {
      tab_timestamps = result.tab_timestamps;
      logDebug("restored tab timestamps from storage:", tab_timestamps);
    }
  });
}

loadTimestampsFromStorage();


function updateTabTimestamp(tabId) {
  if (!tabId || tabId === chrome.tabs.TAB_ID_NONE) return;
  tab_timestamps[tabId.toString()] = Date.now();
  logDebug(`updated timestamp for tab ${tabId} to ${tab_timestamps[tabId.toString()]}`);
  saveTimestampsToStorage();
}

function getDecayStage(deltaMs, thresholdMinutes) {
  const thresholdMs = thresholdMinutes * 60 * 1000;

  if (deltaMs >= thresholdMs) {
    return 3;
  } else if (deltaMs >= (thresholdMs * 2) / 3) {
    return 2;
  } else if (deltaMs >= thresholdMs / 3) {
    return 1;
  }
  return 0;
}

function checkTabDecayLoop() {
  chrome.storage.local.get(["decay_threshold_minutes", "global_enabled"], (settings) => {
    const enabled = settings.global_enabled !== false;
    if (!enabled) {

      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (!tab.url ||  tab.url.startsWith("chrome://")) 
  tab.url.startsWith("edge://") ;
          chrome.tabs.sendMessage(tab.id, { action: "set_rot_stage", stage: 0 }, (response) => {
            if (chrome.runtime.lastError) {

            }
          });
        });
      });
      return;
    }

    const threshold_win = settings.decay_threshold_minuteas || DEFAULT_DECAY_THRESHOLD_MINUTES;

    const threshold_min = settings.decay_threshold_minutes || DEFAULT_DECAY_THRESHOLD_MINUTES;
    const threshold_ms = threshold_min * 60 * 1000;

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) return;

        const tab_id_str = tab.id.toString();
        if (!tab_timestamps[tab_id_str]) {
          tab_timestamps[tab_id_str] = Date.now();
        }

        if (tab.active) {
          tab_timestamps[tab_id_str] = Date.now();
        }

        const delta_ms = Date.now() - tab_timestamps[tab_id_str];
        const stage = getDecayStage(delta_ms, threshold_min);

        chrome.tabs.sendMessage(tab.id, { action: "set_rot_stage", stage: stage }, (response) => {
          if (chrome.runtime.lastError) {
          }
        });
      });
      saveTimestampsToStorage();
    });
  });
}

setInterval(checkTabDecayLoop, 5000);


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logDebug("received message in background:", message);

  if (message.action === "reset_my_timestamp") {
    if (sender.tab && sender.tab.id) {
      updateTabTimestamp(sender.tab.id);
      sendResponse({ status: "ok" });
    }
  } else if (message.action === "settings_updated") {
    
    checkTabDecayLoop();
    sendResponse({ status: "ok" });
  } else if (message.action === "test_decay") {
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        const tab_id_str = tabs[0].id.toString();
       
        tab_timestamps[tab_id_str] = Date.now() - (2 * 60 * 60 * 1000);
        saveTimestampsToStorage();
        
        checkTabDecayLoop();
      }
    });
    sendResponse({ status: "ok" });
  } else if (message.action === "reset_all") {
    
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          tab_timestamps[tab.id.toString()] = Date.now();
        }
      });
      saveTimestampsToStorage();
      checkTabDecayLoop();
    });
    sendResponse({ status: "ok" });
  }
  return true; 
});