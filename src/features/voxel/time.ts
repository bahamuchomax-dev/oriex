// Minimal day/night clock. t in 0..1 (0/1 = midnight, 0.5 = midday).
export const time = { t: 0.3 }
const DAY_SECONDS = 240 // a full day cycle (4 min)

export function advanceTime(dt: number) {
  time.t = (time.t + dt / DAY_SECONDS) % 1
}
// 0 (dark) .. 1 (bright)
export const sunLevel = () => Math.max(0.1, Math.sin(time.t * Math.PI))
export const isNight = () => sunLevel() < 0.35
