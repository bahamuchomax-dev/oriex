# Hamster Room

v7.22 phase4 keeps the hamster room safe and display-only.

## Current Scope
- CSS hamster room with name display, room UI, shop, achievements, and typing entry points.
- 3D hamster room in `HamsterRoom3D.jsx` using the global `window.THREE` from `index.html`.
- 3D/simple display toggle is owned by the parent UI and remains unchanged.
- WebGL failure, missing `window.THREE`, or initialization errors call `onError()` so the parent can fall back to the CSS room.

## phase4-5: Minimal 3D Animation
- `HamsterRoom3D.jsx` uses a small `requestAnimationFrame` loop only for visual motion.
- The wheel is grouped and rotates slowly on each frame.
- Hamster face and body parts are grouped together, then moved and scaled very slightly for a breathing-like motion.
- The animation loop stores its frame id and calls `cancelAnimationFrame` during unmount cleanup.

## phase4-6: Visual Polish
- The hamster screen has extra bottom padding so its final cards clear the fixed bottom navigation, including mobile safe-area space.
- The 3D room colors were softened for a calmer floor/wall contrast.
- The hamster model was lightly reshaped with separate body, head, ears, cheeks, belly, eyes, and nose.
- The wheel was lowered and given simple spokes and support pieces so it reads as grounded on the floor.
- Lightweight flat shadow discs were added under room objects for contact without adding behavior or physics.

## Cleanup
- Existing geometry and material disposal is preserved through `scene.traverse`.
- `renderer.dispose()` and `renderer.forceContextLoss()` are preserved.
- The canvas DOM node is removed on cleanup.
- `ResizeObserver.disconnect()` and window resize listener removal are preserved.

## Safety Notes
- No Firestore writes were added.
- No auth changes were added.
- No FSM, movement AI, collision, camera controls, click movement, shop 3D reflection, achievements persistence, or typing game logic was added.
- Props remain read-only for this feature.
