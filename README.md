# Tab Rot

Tabs you ignore visually decay like old paper left in the sun — faded, grainy, cracked. Clicking a decayed tab triggers a restoration animation back to normal.

## Features

- **3 Decay Stages**: Unvisited tabs gradually fade (sepia wash), turn grainy (parchment noise), and crack (spiderweb fissures).
- **Click to Restore**: Clicking anywhere on a decayed tab triggers a shatter and ripple restoration animation.
- **Persistent State**: Tab decay persists across browser restarts via local storage.
- **Configurable Threshold**: Choose when decay begins (1 hour, 6 hours, 1 day, 1 week) from the popup menu.
- **Zero Disruption**: Overlays use `pointer-events: none` and scripts load at `document_idle`.

### Install (firefox)
1. Install from [Firefox Add on](https://addons.mozilla.org/en-US/firefox/addon/tab-rot123/)
2. Click **Add to Firefox**
3. Open the extension popup to set your decay threshold
