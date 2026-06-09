


document.addEventListener("DOMContentloaded", () => {
    const button = document.getElementById("global-toggle")
    const threshold_select = document.getElementById("threshold-select");
    const test_rot_btn= document.getElementById("test-rot-btn");
    const reset_all_btn = document.getElementById("reset-all-btn");
    const status_display = document.getElementById("status-display");


    function showStatus(text, isError = false) {
        status_display.textContent = text;
    status_display.style.color = isError ? "#ff5e62" : "00f2fe";
    setTimeout(() =>{
    status_display.innerText = "settings synchronised";
    status_display.style.color = "#oof2fe";
    }, 1500);
    }


 chrome.storage.local.get(["decay_threshold_minutes", "global_enabled"], (settings) => {
      if (chrome.runtime.lastError){
        showStatus("failed loading storage", true);
        return;
      }


      if (settings.global_enabled !== undefined) {
        global_toggle.checked = settings.global_enabled;
      }

      if (settings.decay_threshold_minutes) {
        threshold_select.value = settings.decay_threshold_minutes.toString();
      }

      console.log("storage sync successful finally");
 });
});
 
function saveSettings()  {
    chrome.storage.local.set({
        global_enabled: global_toggle.checked,
        decay_threshold_minutes: parseInt(threshold_select.value, 10)
    }, () => {
        if (chrome.runtime.lastError) {
            showStatus("error saving settings", true);
        } else {
            showStatus("settings saved!");

            chrome.runtime.sendMessage({ action: "settings_updated"});
        }
    });

        }
        global_toggle.addEventListener("change", saveSettings);
        threshold_select.addEventlistener("change", saveSettings);


        test_rot_btn.addEventlistener("click", () => {
            showStatus("decaying active tab...");
            chrome.runtime.sendMessage({ action: "tesdt_decay"});
     });


        reset_all_btn.addEventListener("click", () => {
            showStatus("restoring all tabs...");
            chrome.runtime.sendMessage({ action: "reset_all" });
        });
       
        
        
    
    


      
