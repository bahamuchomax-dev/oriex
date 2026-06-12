import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Side-effect: defines window.OriexHamu3D (needs window.THREE from /three.min.js).
// Imported before App mounts so the hamster room can call it at runtime.
import "./lib/hamster/hamsterScene.js";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root was not found.");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
