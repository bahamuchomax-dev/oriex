import { useEffect, useRef } from "react";

// Lightly animated 3D hamster room (phase4-5).
// - Uses the GLOBAL window.THREE loaded by index.html (<script src="./three.min.js">).
//   No npm `three` dependency is added.
// - Fixed camera, fixed lights, no FSM / no controls / no collision.
//   requestAnimationFrame is used only for subtle wheel rotation and breathing.
// - If THREE is missing or WebGL is unavailable / init throws, we call onError()
//   so the parent can fall back to the CSS room. The whole app never crashes.

function webglSupported() {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export default function HamsterRoom3D({ onError }) {
  const mountRef = useRef(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const THREE = typeof window !== "undefined" ? window.THREE : null;
    const mount = mountRef.current;
    if (!mount) return;

    if (!THREE || !webglSupported()) {
      onErrorRef.current?.();
      return;
    }

    let renderer = null;
    let scene = null;
    let camera = null;
    let resizeObserver = null;
    let onWinResize = null;
    let frameId = 0;
    let disposed = false;

    const sizeOf = () => {
      const w = Math.max(1, mount.clientWidth || 320);
      const h = Math.max(1, mount.clientHeight || 240);
      return { w, h };
    };

    try {
      const { w, h } = sizeOf();

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5eadc);

      camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
      camera.position.set(0.15, 3.0, 6.6);
      camera.lookAt(0, 0.7, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h, false);
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      renderer.domElement.setAttribute("aria-hidden", "true");

      // ---- Lights (fixed) ----
      scene.add(new THREE.AmbientLight(0xffffff, 0.85));
      const sun = new THREE.DirectionalLight(0xffffff, 0.7);
      sun.position.set(4, 7, 5);
      scene.add(sun);

      // ---- helpers ----
      const add = (geo, mat, x, y, z, rot, parent = scene) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
        parent.add(m);
        return m;
      };
      const std = (color, opts = {}) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.0, ...opts });
      const flat = (color, opacity) =>
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
      const addShadow = (x, z, sx, sz) => {
        const shadow = add(new THREE.CircleGeometry(1, 32), flat(0x6b4a32, 0.14), x, 0.03, z, [-Math.PI / 2, 0, 0]);
        shadow.scale.set(sx, sz, 1);
        return shadow;
      };

      // ---- Floor ----
      add(new THREE.BoxGeometry(9, 0.4, 7), std(0xd8b58d), 0, -0.2, 0);
      add(new THREE.CylinderGeometry(1.55, 1.7, 0.1, 28), std(0xe6d1b6), -1.55, 0.06, 1.15);

      // ---- Back wall + side panels (glass-ish) ----
      add(new THREE.BoxGeometry(9, 4, 0.2), std(0xead7c2), 0, 1.8, -3.5);
      add(new THREE.BoxGeometry(9, 0.08, 0.18), std(0xd0aa81), 0, 0.06, -3.36);
      const glass = std(0xb9d6df, { transparent: true, opacity: 0.16, roughness: 0.22 });
      add(new THREE.BoxGeometry(0.15, 4, 7), glass, -4.4, 1.8, 0);
      add(new THREE.BoxGeometry(0.15, 4, 7), glass, 4.4, 1.8, 0);

      // ---- Hamster: body + ears + eyes + nose ----
      const hamsterGroup = new THREE.Group();
      const hamsterBaseY = 0;
      hamsterGroup.position.y = hamsterBaseY;
      scene.add(hamsterGroup);
      addShadow(0, 0.55, 1.05, 0.76);
      const fur = std(0xc88d55);
      const faceFur = std(0xdca86d);
      const cream = std(0xf2d7b6);
      const body = add(new THREE.SphereGeometry(1, 30, 22), fur, 0, 0.78, 0.35, null, hamsterGroup);
      body.scale.set(1.0, 0.82, 1.08);
      const head = add(new THREE.SphereGeometry(0.78, 28, 20), faceFur, 0, 1.18, 1.02, null, hamsterGroup);
      head.scale.set(0.92, 0.78, 0.82);
      const belly = add(new THREE.SphereGeometry(0.48, 20, 14), cream, 0, 0.58, 1.1, null, hamsterGroup);
      belly.scale.set(1.05, 0.72, 0.28);
      add(new THREE.SphereGeometry(0.25, 18, 12), fur, -0.44, 1.64, 0.98, null, hamsterGroup);
      add(new THREE.SphereGeometry(0.25, 18, 12), fur, 0.44, 1.64, 0.98, null, hamsterGroup);
      add(new THREE.SphereGeometry(0.14, 14, 10), std(0xeeb2a5), -0.44, 1.64, 1.03, null, hamsterGroup);
      add(new THREE.SphereGeometry(0.14, 14, 10), std(0xeeb2a5), 0.44, 1.64, 1.03, null, hamsterGroup);
      const eye = std(0x2b2724, { roughness: 0.4 });
      add(new THREE.SphereGeometry(0.095, 12, 10), eye, -0.24, 1.25, 1.58, null, hamsterGroup);
      add(new THREE.SphereGeometry(0.095, 12, 10), eye, 0.24, 1.25, 1.58, null, hamsterGroup);
      add(new THREE.SphereGeometry(0.17, 14, 10), cream, -0.22, 1.04, 1.56, null, hamsterGroup);
      add(new THREE.SphereGeometry(0.17, 14, 10), cream, 0.22, 1.04, 1.56, null, hamsterGroup);
      add(new THREE.SphereGeometry(0.08, 12, 10), std(0xe98692), 0, 1.1, 1.68, null, hamsterGroup);

      // ---- House (box + roof) ----
      addShadow(-2.62, -1.48, 0.96, 0.66);
      add(new THREE.BoxGeometry(1.75, 1.12, 1.35), std(0xc79264), -2.62, 0.56, -1.48);
      add(new THREE.ConeGeometry(1.42, 0.92, 4), std(0xc96d58), -2.62, 1.58, -1.48, [0, Math.PI / 4, 0]);

      // ---- Wheel ----
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(2.75, 1.15, -0.7);
      scene.add(wheelGroup);
      addShadow(2.75, -0.7, 0.52, 1.1);
      add(new THREE.BoxGeometry(0.14, 1.18, 0.12), std(0x9d8261), 2.75, 0.58, -1.68);
      add(new THREE.BoxGeometry(1.0, 0.12, 0.28), std(0x9d8261), 2.75, 0.08, -1.68);
      add(new THREE.TorusGeometry(1.06, 0.13, 12, 32), std(0xb99772), 0, 0, 0, [0, Math.PI / 2, 0], wheelGroup);
      add(new THREE.CylinderGeometry(0.045, 0.045, 2.02, 10), std(0xd9c2a2), 0, 0, 0, null, wheelGroup);
      add(new THREE.CylinderGeometry(0.045, 0.045, 2.02, 10), std(0xd9c2a2), 0, 0, 0, [Math.PI / 2, 0, 0], wheelGroup);
      add(new THREE.SphereGeometry(0.16, 14, 10), std(0x8e7c6b), 0, 0, 0, null, wheelGroup);

      // ---- Plant (stem + leaves) ----
      addShadow(3.35, 1.75, 0.34, 0.24);
      add(new THREE.CylinderGeometry(0.12, 0.16, 1.0, 12), std(0x7d6035), 3.35, 0.5, 1.75);
      add(new THREE.SphereGeometry(0.48, 16, 12), std(0x679b68), 3.25, 1.14, 1.78);
      add(new THREE.SphereGeometry(0.34, 14, 10), std(0x7cad72), 3.62, 0.95, 1.86);

      // ---- Food bowl ----
      addShadow(1.42, 1.78, 0.42, 0.3);
      add(new THREE.CylinderGeometry(0.48, 0.38, 0.26, 20), std(0xd7d2c8), 1.42, 0.13, 1.78);
      add(new THREE.SphereGeometry(0.18, 12, 10), std(0xd98a3a), 1.28, 0.29, 1.78);
      add(new THREE.SphereGeometry(0.16, 12, 10), std(0xe0a04c), 1.52, 0.3, 1.84);

      const render = () => {
        if (disposed || !renderer) return;
        renderer.render(scene, camera);
      };

      const animate = () => {
        if (disposed) return;
        frameId = requestAnimationFrame(animate);
        const t = performance.now() * 0.001;
        wheelGroup.rotation.x += 0.006;
        hamsterGroup.position.y = hamsterBaseY + Math.sin(t * 2) * 0.015;
        hamsterGroup.scale.setScalar(1 + Math.sin(t * 2) * 0.008);
        render();
      };

      const handleResize = () => {
        if (disposed || !renderer) return;
        const s = sizeOf();
        camera.aspect = s.w / s.h;
        camera.updateProjectionMatrix();
        renderer.setSize(s.w, s.h, false);
      };

      animate();

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(mount);
      } else {
        onWinResize = handleResize;
        window.addEventListener("resize", onWinResize);
      }
    } catch (err) {
      // Any init failure means safe fallback, not an app crash.
      // eslint-disable-next-line no-console
      console.error("3D room init failed, falling back", err);
      onErrorRef.current?.();
    }

    return () => {
      disposed = true;
      try {
        if (frameId) cancelAnimationFrame(frameId);
        if (resizeObserver) resizeObserver.disconnect();
        if (onWinResize) window.removeEventListener("resize", onWinResize);
        if (scene) {
          scene.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              mats.forEach((m) => m && m.dispose && m.dispose());
            }
          });
        }
        if (renderer) {
          renderer.dispose();
          if (renderer.forceContextLoss) renderer.forceContextLoss();
          if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
        }
      } catch {
        /* ignore cleanup errors */
      }
      renderer = null;
      scene = null;
      camera = null;
    };
  }, []);

  return <div className="hamster-3d-canvas" ref={mountRef} aria-hidden="true" />;
}
