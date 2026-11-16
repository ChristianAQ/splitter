import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { IS_IOS_STANDALONE } from "./lib/ios";

// iOS Safari only applies `:active` styles (every press/tap feedback in the
// app) on pages that have a touch listener somewhere up the tree. Tab
// screens happened to get one from the page-swipe handler; group detail,
// Amigos and Login had none, so buttons there gave no feedback on iPhone.
document.addEventListener("touchstart", () => {}, { passive: true });

// See index.css (`html` min-height): as an installed iOS app the document
// has to be at least as tall as the physical screen, and CSS has no unit
// that reliably means that there. `screen.width/height` do — they're the
// device's size in CSS pixels and don't swap when it rotates.
if (IS_IOS_STANDALONE) {
  const setScreenHeight = () => {
    const landscape = window.matchMedia("(orientation: landscape)").matches;
    const height = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
    document.documentElement.style.setProperty("--screen-height", `${height}px`);
  };
  setScreenHeight();
  window.addEventListener("orientationchange", setScreenHeight);
  window.addEventListener("resize", setScreenHeight);
}

// Installed on an iPhone home screen, WebKit often leaves the page panned
// upward after the on-screen keyboard closes, until something scrolls. A
// scroll "to where we already are" is enough to make it re-lay the page
// out. (Sheets do their own, stricter version of this — see BottomSheet.)
document.addEventListener("focusout", () => {
  setTimeout(() => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return; // moved to another field
    if (document.body.style.overflow === "hidden") return; // a sheet is open and handles this itself
    // A real 1px round trip, not a scroll "to where we already are" —
    // the latter is a no-op WebKit is free to ignore.
    const y = window.scrollY;
    window.scrollTo(0, y + 1);
    window.scrollTo(0, y);
  }, 80);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
