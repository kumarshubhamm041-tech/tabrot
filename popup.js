const DEFAULT_THRESHOLD_MINUTES = 60;

document.addEventListener("DOMContentLoaded", () => {
  const global_toggle = document.getElementById("global-toggle");
  const threshold_select = document.getElementById("threshold-select");
  const test_rot_btn = document.getElementById("test-rot-btn");
  const reset_all_btn = document.getElementById("reset-all-btn");
  const status_display = document.getElementById("status-display");

  let status_timer = null;

  function showStatus(text, isError = false) {
    if (status_timer) clearTimeout(status_timer);
    status_display.textContent = text;
    status_display.style.color = isError ? "#ff5e62" : "#00f2fe";
    status_timer = setTimeout(() => {
      status_display.textContent = "settings synchronised";
      status_display.style.color = "#8c82ab";
    }, 2000);
  }

  chrome.storage.local.get(["decay_threshold_minutes", "global_enabled"], (settings) => {
    if (chrome.runtime.lastError) {
      showStatus("failed loading settings", true);
      return;
    }
    if (settings.global_enabled !== undefined) {
      global_toggle.checked = settings.global_enabled;
    }
    const threshold = settings.decay_threshold_minutes || DEFAULT_THRESHOLD_MINUTES;
    if ([60, 360, 1440, 10080].includes(threshold)) {
      threshold_select.value = threshold.toString();
    }
    console.log("storage sync successful finally");
  });

  function saveSettings() {
    const threshold = parseInt(threshold_select.value, 10);
    chrome.storage.local.set(
      {
        global_enabled: global_toggle.checked,
        decay_threshold_minutes: threshold,
      },
      () => {
        if (chrome.runtime.lastError) {
          showStatus("error saving settings", true);
          return;
        }
        showStatus("settings saved!");
        chrome.runtime.sendMessage({ action: "settings_updated" }, () => {
          void chrome.runtime.lastError;
        });
      }
    );
  }

  global_toggle.addEventListener("change", saveSettings);
  threshold_select.addEventListener("change", saveSettings);

  test_rot_btn.addEventListener("click", () => {
    showStatus("decaying active tab...");
    chrome.runtime.sendMessage({ action: "test_decay" }, () => {
      void chrome.runtime.lastError;
    });
  });

  reset_all_btn.addEventListener("click", () => {
    showStatus("restoring all tabs...");
    chrome.runtime.sendMessage({ action: "reset_all" }, () => {
      void chrome.runtime.lastError;
    });
  });
});
