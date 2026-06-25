// Shared signals between the world (which detects mining/breaking/placing) and
// the first-person Hand view (which animates). Plain mutable singleton — read
// every frame by Hand, written by VoxelWorld.
export const handState = {
  mining: false, // left button held on a valid target → gentle swing
  breakPulse: 0, // incremented when a block finishes breaking → strong swing
  placePulse: 0, // incremented when a block is placed → push forward
}
