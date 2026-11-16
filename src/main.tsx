import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// iOS Safari only applies `:active` styles (every press/tap feedback in the
// app) on pages that have a touch listener somewhere up the tree. Tab
// screens happened to get one from the page-swipe handler; group detail,
// Amigos and Login had none, so buttons there gave no feedback on iPhone.
document.addEventListener("touchstart", () => {}, { passive: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
