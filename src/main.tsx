import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// iOS Safari only applies `:active` styles (every press/tap feedback in the
// app) on pages that have a touch listener somewhere up the tree. Tab
// screens happened to get one from the page-swipe handler; group detail,
// Amigos and Login had none, so buttons there gave no feedback on iPhone.
document.addEventListener("touchstart", () => {}, { passive: true });

// Installed on an iPhone home screen, WebKit often leaves the page panned
// upward after the on-screen keyboard closes, until something scrolls. A
// scroll "to where we already are" is enough to make it re-lay the page
// out. (Sheets do their own, stricter version of this — see BottomSheet.)
document.addEventListener("focusout", () => {
  setTimeout(() => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return; // moved to another field
    window.scrollTo(window.scrollX, window.scrollY);
  }, 80);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
