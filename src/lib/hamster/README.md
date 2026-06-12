# 3D Hamster scene
`hamsterScene.js` defines `window.OriexHamu3D` (three.js r149). It is a
side-effect module extracted from the deployed build. It reads `window.THREE`,
provided by `/three.min.js` (classic <script> in index.html). The app calls
`window.OriexHamu3D(canvas, env)` at runtime, so this is imported in main.tsx
before <App/> mounts. Do not change animation/geometry.
