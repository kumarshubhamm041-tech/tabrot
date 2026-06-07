
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