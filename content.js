
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
  grain_div.innerHTML = `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%; display:block;">
      <filter id="tab-rot-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.35 0"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#tab-rot-noise)"/>
    </svg>
  `;
  rot_overlay_div.appendChild(grain_div);

    const cracks_div = document.createElement("div");
  cracks_div.className = "tab-rot-layer tab-rot-cracks";
  cracks_div.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%; display:block;">
      <g stroke="rgba(40,30,20,0.8)" stroke-width="1.5" fill="none">
        <path d="M500,500 L450,420 L350,390 L300,310 L150,290" />
        <path d="M500,500 L560,460 L680,430 L800,450 L950,420" />
        <path d="M500,500 L520,590 L490,700 L530,820 L480,950" />
        <path d="M450,420 L470,300 L410,200 L460,80" />
        <path d="M560,460 L620,550 L750,620 L880,720" />
        <path d="M490,700 L380,750 L270,720 L120,760" />
        <path d="M300,310 L220,240 L110,260" />
        <path d="M680,430 L730,320 L860,280" />
      </g>
    </svg>
  `;
  rot_overlay_div.appendChild(cracks_div);

  the_actual_body.appendChild(rot_overlay_div);
  console.log("storage sync successful finally");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectRotOverlay);
} else {
  injectRotOverlay();
}








function updateVisualsForRotStage() {
  console.log("updating visuals for stage:", current_rot_stage);
}
function updateVisualsForRotStage() {
  console.log("updating visuals for stage:", current_rot_stage);
  if (!rot_overlay_div) {
    injectRotOverlay();
  }
  if (!rot_overlay_div) return;

  the_actual_body = document.body || document.getElementsByTagName("body")[0];
  if (!the_actual_body) return;

  the_actual_body.classList.remove(
    "tab-rot-stage-1-body",
    "tab-rot-stage-2-body",
    "tab-rot-stage-3-body"
  );

  rot_overlay_div.className = "";

  if (current_rot_stage >= 1) {
    the_actual_body.classList.add(`tab-rot-stage-1-body`);
  }
  if (current_rot_stage >= 2) {
    the_actual_body.classList.add(`tab-rot-stage-2-body`);
    rot_overlay_div.classList.add("tab-rot-stage-2");
  }
  if (current_rot_stage >= 3) {
    the_actual_body.classList.add(`tab-rot-stage-3-body`);
    rot_overlay_div.classList.add("tab-rot-stage-3");
  }


  console.log(`visual state updated: stage ${current_rot_stage}`);
}

let is_restoring = false;

function requestRestoration() {
  if (current_rot_stage === 0 || is_restoring) return;
  is_restoring = true;

  console.log("restoration requested, informing background script...");
  chrome.runtime.sendMessage({ action: "reset_my_timestamp" }, (response) => {
    if (chrome.runtime.lastError) {
      console.log("swallowed runtime error during message reset:", chrome.runtime.lastError);
    }
  });

  playRestorationAnimation();
}

document.addEventListener("click", () => {
  if (current_rot_stage > 0) {
    console.log("click detected, running restore...");
    requestRestoration();
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && current_rot_stage > 0) {
    console.log("tab became visible, running restore...");
    requestRestoration();
  }
});

function playRestorationAnimation() {
  console.log("playing restoration animation...");
  is_restoring = false;
}