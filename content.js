(() => {
  if (window.top !== window) {
    return;
  }

  let current_rot_stage = 0;
  let previous_rot_stage = 0;
  let is_restoring = false;
  let rot_overlay_div = null;

  const root_el = document.documentElement;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "set_rot_stage") {
      if (is_restoring) {
        sendResponse({ status: "ignored" });
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

    let overlay = document.getElementById("tab-rot-overlay");
    if (overlay) {
      rot_overlay_div = overlay;
      return overlay;
    }

    overlay = document.createElement("div");
    overlay.id = "tab-rot-overlay";

    const vignette_layer = document.createElement("div");
    vignette_layer.className = "tab-rot-layer tab-rot-vignette";

    const grain_layer = document.createElement("div");
    grain_layer.className = "tab-rot-layer tab-rot-grain";

    const svgNS = "http://www.w3.org/2000/svg";
    const grainSvg = document.createElementNS(svgNS, "svg");
    grainSvg.setAttribute("width", "100%");
    grainSvg.setAttribute("height", "100%");
    grainSvg.style.width = "100%";
    grainSvg.style.height = "100%";
    grainSvg.style.display = "block";

    const filter = document.createElementNS(svgNS, "filter");
    filter.id = "tab-rot-noise";

    const feTurbulence = document.createElementNS(svgNS, "feTurbulence");
    feTurbulence.setAttribute("type", "fractalNoise");
    feTurbulence.setAttribute("baseFrequency", "0.75");
    feTurbulence.setAttribute("numOctaves", "3");
    feTurbulence.setAttribute("stitchTiles", "stitch");

    const feColorMatrix = document.createElementNS(svgNS, "feColorMatrix");
    feColorMatrix.setAttribute("type", "matrix");
    feColorMatrix.setAttribute("values", "0.3 0 0 0 0.15  0 0.25 0 0 0.1  0 0 0.15 0 0.05  0 0 0 0.4 0");

    filter.appendChild(feTurbulence);
    filter.appendChild(feColorMatrix);
    grainSvg.appendChild(filter);

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("filter", "url(#tab-rot-noise)");
    grainSvg.appendChild(rect);

    grain_layer.appendChild(grainSvg);

    const cracks_layer = document.createElement("div");
    cracks_layer.className = "tab-rot-layer tab-rot-cracks";

    overlay.appendChild(vignette_layer);
    overlay.appendChild(grain_layer);
    overlay.appendChild(cracks_layer);
    document.body.appendChild(overlay);
    rot_overlay_div = overlay;
    return overlay;
  }

  function generateCracks(overlay) {
    const cracks_layer = overlay.querySelector(".tab-rot-cracks");
    if (!cracks_layer) return;

    while (cracks_layer.firstChild) {
      cracks_layer.removeChild(cracks_layer.firstChild);
    }

    const svgNS = "http://www.w3.org/2000/svg";
    const cracksSvg = document.createElementNS(svgNS, "svg");
    cracksSvg.setAttribute("width", "100%");
    cracksSvg.setAttribute("height", "100%");
    cracksSvg.setAttribute("viewBox", "0 0 1000 1000");
    cracksSvg.setAttribute("preserveAspectRatio", "none");
    cracksSvg.style.width = "100%";
    cracksSvg.style.height = "100%";
    cracksSvg.style.display = "block";

    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("stroke", "rgba(42,28,14,0.88)");
    g.setAttribute("fill", "none");
    g.setAttribute("stroke-linecap", "round");

    const center_x = 350 + Math.random() * 300;
    const center_y = 350 + Math.random() * 300;
    const num_cracks = 9 + Math.floor(Math.random() * 5);

    for (let i = 0; i < num_cracks; i++) {
      const base_angle = (i * 2 * Math.PI) / num_cracks + (Math.random() * 0.4 - 0.2);
      let x = center_x;
      let y = center_y;
      let length = 110 + Math.random() * 130;
      const segments = 4 + Math.floor(Math.random() * 3);
      let pathD = `M ${x.toFixed(0)} ${y.toFixed(0)}`;

      for (let j = 0; j < segments; j++) {
        x += Math.cos(base_angle) * length + (Math.random() * 50 - 25);
        y += Math.sin(base_angle) * length + (Math.random() * 50 - 25);
        pathD += ` L ${x.toFixed(0)} ${y.toFixed(0)}`;
        length *= 0.68;

        if (j > 0 && Math.random() > 0.4) {
          const fork_angle = base_angle + (Math.random() > 0.5 ? 0.6 : -0.6);
          const fork_x = x + Math.cos(fork_angle) * (length * 0.5);
          const fork_y = y + Math.sin(fork_angle) * (length * 0.5);
          const forkPath = document.createElementNS(svgNS, "path");
          forkPath.setAttribute("d", `M ${x.toFixed(0)} ${y.toFixed(0)} L ${fork_x.toFixed(0)} ${fork_y.toFixed(0)}`);
          forkPath.setAttribute("stroke-width", "0.8");
          g.appendChild(forkPath);
        }
      }
      const pathEl = document.createElementNS(svgNS, "path");
      pathEl.setAttribute("d", pathD);
      pathEl.setAttribute("stroke-width", "1.8");
      g.appendChild(pathEl);
    }

    cracksSvg.appendChild(g);
    cracks_layer.appendChild(cracksSvg);
  }

  function applyRotStage(stage) {
    previous_rot_stage = current_rot_stage;
    current_rot_stage = Math.max(0, Math.min(3, stage || 0));

    const overlay = ensureRotOverlay();
    if (!overlay) return;

    root_el.classList.toggle("tab-rot-stage-1", current_rot_stage >= 1);
    root_el.classList.toggle("tab-rot-stage-2", current_rot_stage >= 2);
    root_el.classList.toggle("tab-rot-stage-3", current_rot_stage >= 3);

    overlay.classList.toggle("tab-rot-stage-1", current_rot_stage === 1);
    overlay.classList.toggle("tab-rot-stage-2", current_rot_stage === 2);
    overlay.classList.toggle("tab-rot-stage-3", current_rot_stage === 3);

    if (current_rot_stage >= 3 && (!overlay.querySelector(".tab-rot-cracks svg") || previous_rot_stage < 3)) {
      generateCracks(overlay);
    }
  }

  function requestRestoration(clickX, clickY) {
    if (current_rot_stage === 0 || is_restoring) return;
    is_restoring = true;

    chrome.runtime.sendMessage({ action: "reset_my_timestamp" }, () => {
      void chrome.runtime.lastError;
    });

    playRestorationAnimation(clickX, clickY);
  }

  function playRestorationAnimation(clickX, clickY) {
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

    const ripple = document.createElement("div");
    ripple.className = "tab-rot-ripple";
    ripple.style.left = `${clickX || window.innerWidth / 2}px`;
    ripple.style.top = `${clickY || window.innerHeight / 2}px`;
    overlay.appendChild(ripple);

    overlay.classList.add("tab-rot-shattering", "tab-rot-restoring");
    root_el.classList.add("tab-rot-restoring");
    root_el.classList.remove("tab-rot-stage-1", "tab-rot-stage-2", "tab-rot-stage-3");

    setTimeout(() => {
      overlay.classList.remove("tab-rot-shattering", "tab-rot-restoring", "tab-rot-stage-1", "tab-rot-stage-2", "tab-rot-stage-3");
      root_el.classList.remove("tab-rot-restoring");
      if (flash && flash.parentNode) {
        flash.parentNode.removeChild(flash);
      }
      if (ripple && ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
      current_rot_stage = 0;
      previous_rot_stage = 0;
      is_restoring = false;
    }, 800);
  }

  document.addEventListener("click", (e) => {
    if (current_rot_stage > 0 && !is_restoring) {
      requestRestoration(e.clientX, e.clientY);
    }
  }, true);

  chrome.runtime.sendMessage({ action: "hello" }, (response) => {
    void chrome.runtime.lastError;
    if (response && typeof response.stage === "number") {
      applyRotStage(response.stage);
    }
  });
})();
