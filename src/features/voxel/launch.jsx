// ─────────────────────────────────────────────────────────────────────────────
// Live launcher for the voxel game. The running app is the frozen legacy
// bundle (booted by src/main.js). We inject a card into the 広場 "ミニゲーム"
// grid (.ox-plaza-action-grid, same row as the hamster room) and mount the
// React Three Fiber game into its own overlay root on demand. The heavy game
// chunk is lazy-loaded only when opened.
// ─────────────────────────────────────────────────────────────────────────────
import { createRoot } from 'react-dom/client'
import { createElement as h, Suspense, lazy } from 'react'

const VoxelGame = lazy(() => import('./VoxelGame.tsx'))

let root = null
let host = null

export function closeVoxelGame() {
  try {
    if (document.pointerLockElement) document.exitPointerLock()
  } catch {
    /* ignore */
  }
  if (root) {
    root.unmount()
    root = null
  }
  if (host && host.parentNode) host.parentNode.removeChild(host)
  host = null
}

export function openVoxelGame() {
  if (host) return
  host = document.createElement('div')
  host.id = 'voxel-host'
  document.body.appendChild(host)
  root = createRoot(host)
  root.render(
    h(
      Suspense,
      { fallback: h('div', { className: 'voxel-loading' }, '読み込み中…') },
      h(VoxelGame, { onBack: closeVoxelGame }),
    ),
  )
}

function injectStyles() {
  if (document.getElementById('voxel-launch-style')) return
  const s = document.createElement('style')
  s.id = 'voxel-launch-style'
  s.textContent = `
    .voxel-loading{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
      background:#0b0f17;color:#fff;font:700 16px system-ui,sans-serif;z-index:60}
  `
  document.head.appendChild(s)
}

function makeCard() {
  const btn = document.createElement('button')
  btn.id = 'voxel-plaza-card'
  btn.className = 'ox-plaza-action ox-plaza-voxel'
  btn.type = 'button'
  btn.style.cssText =
    'display:flex;align-items:center;gap:8px;padding:12px 10px;border-radius:18px;' +
    'border:1px solid rgba(58,123,213,0.55);background:rgba(58,123,213,0.16);' +
    'cursor:pointer;text-align:left;font-family:inherit;min-width:0'
  btn.innerHTML =
    '<span style="font-size:26px;line-height:1">🧊</span>' +
    '<span style="display:flex;flex-direction:column;min-width:0">' +
    '<span style="font-weight:700;font-size:14px;color:#2a3550">探索ワールド</span>' +
    '<span style="font-size:11px;color:#5b6b8a">3Dボクセル</span></span>'
  btn.addEventListener('click', openVoxelGame)
  return btn
}

function tryInject() {
  const grids = document.querySelectorAll('.ox-plaza-action-grid')
  grids.forEach((grid) => {
    if (!grid.querySelector('#voxel-plaza-card')) grid.appendChild(makeCard())
  })
}

export function mountVoxelLauncher() {
  if (typeof document === 'undefined') return
  injectStyles()
  tryInject()
  // The 広場 screen mounts/re-renders on navigation — re-inject when it appears.
  let scheduled = false
  const obs = new MutationObserver(() => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      tryInject()
    })
  })
  obs.observe(document.body, { childList: true, subtree: true })
}
