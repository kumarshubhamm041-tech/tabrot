let current_rot_stage = 0;
let previous_rot_stage = 0;
let is_restoring = false;
let rot_overlay_div = null;

const root_el = document.documentElement;

function logDebug(message, data = null) {
  if (data) {
    console.log(`[TabRotContent] ${message}`, data);
  } else {
    console.log(`[TabRotContent] ${message}`);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "set_rot_stage") {
    if (is_restoring) {
      sendResponse({ status: "ignored", reason: "restoring" });
      return;
    }
    applyRotStage(message.stage);
    sendResponse({ status: "ok", stage: current_rot_stage });
  } else if (message.action === "restore") {
    requestRestoration();
    sendResponse({ status: "ok" });
  }
});

function ensureRotOverlay() {
  if (rot_overlay_div && rot_overlay_div.isConnected) return rot_overlay_div;
  if (!document.body) return null;

  const overlay = document.createElement("div");
  overlay.id = "tab-rot-overlay";

  const grain_layer = document.createElement("div");
  grain_layer.className = "tab-rot-layer tab-rot-grain";
  grain_layer.innerHTML =
    '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">' +
    '<filter id="tab-rot-noise">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>' +
    '<feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0"/>' +
    "</filter>" +
    '<rect width="100%" height="100%" filter="url(#tab-rot-noise)"/>' +
    "</svg>";

  const cracks_layer = document.createElement("div");
  cracks_layer.className = "tab-rot-layer tab-rot-cracks";

  overlay.appendChild(grain_layer);
  overlay.appendChild(cracks_layer);
  document.body.appendChild(overlay);
  rot_overlay_div = overlay;
  logDebug("rot overlay injected into the page");
  return overlay;
}

function generateCracks(overlay) {
  const cracks_layer = overlay.querySelector(".tab-rot-cracks");
  if (!cracks_layer) return;

  const center_x = 350 + Math.random() * 300;
  const center_y = 350 + Math.random() * 300;
  const num_cracks = 8 + Math.floor(Math.random() * 5);

  let paths = "";
  for (let i = 0; i < num_cracks; i++) {
    const base_angle = (i * 2 * Math.PI) / num_cracks + (Math.random() * 0.5 - 0.25);
    let x = center_x;
    let y = center_y;
    let length = 100 + Math.random() * 140;
    const segments = 3 + Math.floor(Math.random() * 3);
    let path = `M ${x.toFixed(0)} ${y.toFixed(0)}`;

    for (let j = 0; j < segments; j++) {
      x += Math.cos(base_angle) * length + (Math.random() * 60 - 30);
      y += Math.sin(base_angle) * length + (Math.random() * 60 - 30);
      path += ` L ${x.toFixed(0)} ${y.toFixed(0)}`;
      length *= 0.7;
    }
    paths += `<path d="${path}" />`;
  }

  cracks_layer.innerHTML =
    '<svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">' +
    '<g stroke="rgba(48,34,20,0.9)" stroke-width="1.6" fill="none" stroke-linecap="round">' +
    paths +
    "</g></svg>";
  logDebug("cracks regenerated", { center_x, center_y, num_cracks });
}

function applyRotStage(stage) {
  previous_rot_stage = current_rot_stage;
  current_rot_stage = Math.max(0, Math.min(3, stage || 0));

  const overlay = ensureRotOverlay();
  if (!overlay) return;

  root_el.classList.toggle("tab-rot-stage-1", current_rot_stage >= 1);
  root_el.classList.toggle("tab-rot-stage-2", current_rot_stage >= 2);
  root_el.classList.toggle("tab-rot-stage-3", current_rot_stage >= 3);

  overlay.classList.toggle("tab-rot-stage-2", current_rot_stage >= 2);
  overlay.classList.toggle("tab-rot-stage-3", current_rot_stage >= 3);

  if (current_rot_stage >= 3 && previous_rot_stage < 3) {
    generateCracks(overlay);
  }

  if (current_rot_stage === 3) {
    logDebug("ROT STAGE 3 TRIGGERED OH GOD");
  }
}

function requestRestoration() {
  if (current_rot_stage === 0 || is_restoring) return;
  is_restoring = true;
  logDebug("restoration requested, informing background script...");

  chrome.runtime.sendMessage({ action: "reset_my_timestamp" }, () => {
    void chrome.runtime.lastError;
  });

  playRestorationAnimation();
}

function playRestorationAnimation() {
  const overlay = rot_overlay_div;
  if (!overlay) {
    current_rot_stage = 0;
    is_restoring = false;
    return;
  }

  let flash = overlay.querySelector(".tab-rot-flash-overlay");
  if (!flash) {
    flash = document.createElement("div");
    flash.className = "tab-rot-flash-overlay";
    overlay.appendChild(flash);
  }

  overlay.classList.add("tab-rot-shattering", "tab-rot-restoring");
  root_el.classList.add("tab-rot-restoring");
  root_el.classList.remove("tab-rot-stage-1", "tab-rot-stage-2", "tab-rot-stage-3");

  setTimeout(() => {
    overlay.classList.remove("tab-rot-shattering", "tab-rot-restoring", "tab-rot-stage-2", "tab-rot-stage-3");
    root_el.classList.remove("tab-rot-restoring");
    if (flash && flash.parentNode) {
      flash.parentNode.removeChild(flash);
    }
    current_rot_stage = 0;
    previous_rot_stage = 0;
    is_restoring = false;
    logDebug("restoration animation completed successfully.");
  }, 800);
}

document.addEventListener("click", () => {
  if (current_rot_stage > 0 && !is_restoring) {
    logDebug("click detected, running restore...");
    requestRestoration();
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && current_rot_stage > 0 && !is_restoring) {
    logDebug("tab became visible, running restore...");
    requestRestoration();
  }
});

chrome.runtime.sendMessage({ action: "hello" }, (response) => {
  void chrome.runtime.lastError;
  if (response && typeof response.stage === "number") {
    applyRotStage(response.stage);
  }
});

logDebug("content script loaded. may the tabs rest in peace");
