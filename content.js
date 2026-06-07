
let current_rot_stage = 0;
let rot_overlay_div = null;
let the_actual_body = document.body;

console.log("Tab Rot content script loaded, listening for messages...");


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("content.js received message:", message);

  if (message.action === "set_rot_stage") {
    const previous_stage = current_rot_stage;
    current_rot_stage = message.stage;
    
    console.log(`updating rot state from ${previous_stage} to ${current_rot_stage}`);
    
    if (current_rot_stage === 3) {
      console.log("ROT STAGE 3 TRIGGERED OH GOD");
    }

    updateVisualsForRotStage();
    sendResponse({ status: "ok", stage: current_rot_stage });
  }
});








function updateVisualsForRotStage() {
  console.log("updating visuals for stage:", current_rot_stage);
}
function injectRotOverlay() {
  if (document.getElementById("tab-rot-overlay")) {
    rot_overlay_div = document.getElementById("tab-rot-overlay");
    return;
  }

  the_actual_body = document.body || document.getElementsByTagName("body")[0];
  if (!the_actual_body) return;

  rot_overlay_div = document.createElement("div");
  rot_overlay_div.id = "tab-rot-overlay";

  const grain_div = document.createElement("div");
  grain_div.className = "tab-rot-layer tab-rot-grain";
  rot_overlay_div.appendChild(grain_div);

  const cracks_div = document.createElement("div");
  cracks_div.className = "tab-rot-layer tab-rot-cracks";
  rot_overlay_div.appendChild(cracks_div);

  the_actual_body.appendChild(rot_overlay_div);
  console.log("storage sync successful finally");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectRotOverlay);
} else {
  injectRotOverlay();
}








// placeholder visual update function since we are doing this step by step lmaoo
function updateVisualsForRotStage() {
  console.log("updating visuals for stage:", current_rot_stage);
}