// ─────────────────────────────────────────────────────────────────────────────
// Shared touch-input state for mobile. The on-screen controls write here; the
// Player reads move/look/jump and the VoxelWorld reads break/place. Desktop
// (pointer-lock + keyboard + mouse) is unaffected — `active` stays false until
// the first touch.
// ─────────────────────────────────────────────────────────────────────────────
export const touch = {
  supported:
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0),
  active: false, // true once the player uses the touch UI
  mx: 0, // move vector x (-1..1), + = right
  my: 0, // move vector y (-1..1), - = forward
  lookDX: 0, // look delta to apply next frame (pixels)
  lookDY: 0,
  jump: false,
  breaking: false,
  placePulse: 0, // increment to request a single place action
}
