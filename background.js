
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