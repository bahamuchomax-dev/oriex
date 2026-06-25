// ─────────────────────────────────────────────────────────────────────────────
// Live launcher for the voxel game. The running app is the frozen legacy
// bundle (booted by src/main.js), so we can't use the React migration shell.
// Instead we add a small launcher button to the live page and mount the game
// into its OWN React root (a full-screen overlay) on demand. The heavy game
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
  const btn = document.getElementById('voxel-launch-btn')
  if (btn) btn.style.display = ''
}

export function openVoxelGame() {
  if (host) return
  const btn = document.getElementById('voxel-launch-btn')
  if (btn) btn.style.display = 'none'
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
    #voxel-launch-btn{position:fixed;right:14px;bottom:max(72px,calc(env(safe-area-inset-bottom) + 72px));
      z-index:9999;padding:11px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.35);
      background:linear-gradient(135deg,#3a7bd5,#2aa37a);color:#fff;
      font:700 14px system-ui,'Segoe UI',sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.35);
      cursor:pointer;-webkit-tap-highlight-color:transparent}
    #voxel-launch-btn:active{filter:brightness(1.12)}
    .voxel-loading{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
      background:#0b0f17;color:#fff;font:700 16px system-ui,sans-serif;z-index:60}
  `
  document.head.appendChild(s)
}

export function mountVoxelLauncher() {
  if (typeof document === 'undefined') return
  const add = () => {
    if (!document.body || document.getElementById('voxel-launch-btn')) return
    injectStyles()
    const btn = document.createElement('button')
    btn.id = 'voxel-launch-btn'
    btn.type = 'button'
    btn.textContent = '🧊 探索'
    btn.title = '3Dボクセルワールドを開く'
    btn.addEventListener('click', openVoxelGame)
    document.body.appendChild(btn)
  }
  if (document.body) add()
  else window.addEventListener('DOMContentLoaded', add)
}
