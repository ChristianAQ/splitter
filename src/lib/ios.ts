// iPhone/iPod, and iPad (which reports itself as a Mac but has a touch screen).
export const IS_IOS =
  typeof navigator !== "undefined" &&
  (/iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/**
 * Focus a text field without letting iOS pan the page to it.
 *
 * When a field gets focus, WebKit scrolls/pans the whole page so the field
 * clears the keyboard — and, as an installed app, tends to leave the page
 * panned afterwards. For the instant of the focus call the field is moved
 * far off-screen, so there's nowhere sensible to pan to and WebKit leaves
 * the page alone (the technique React Aria uses for the same problem).
 * Whoever calls this is responsible for making sure the field is visible —
 * sheets size themselves to the space above the keyboard and scroll the
 * field into view (see BottomSheet).
 *
 * The transform has to be in place *before* focus() runs, which is why this
 * exists as a function instead of being patched up in a focus listener.
 */
export function focusWithoutPanning(field: HTMLElement) {
  if (!IS_IOS) {
    field.focus({ preventScroll: true });
    return;
  }
  field.style.transform = "translateY(-2000px)";
  field.focus({ preventScroll: true });
  requestAnimationFrame(() => {
    field.style.transform = "";
  });
}

// ---------------------------------------------------------------------------
// Page scroll lock (for sheets and dialogs)
// ---------------------------------------------------------------------------

let locks = 0;
let previousOverflow = "";

/**
 * Stops the page behind a sheet from scrolling. Returns the function that
 * releases it; nested locks (a confirm dialog over a sheet) are counted.
 *
 * Deliberately just `overflow: hidden`, and deliberately NOT the usual iOS
 * recipe of taking <body> out of the flow with `position: fixed`. Installed
 * on an iPhone home screen (translucent status bar), the area this app can
 * lay out in is one status bar shorter than the screen, and WebKit only
 * lets fixed-position content use the whole screen while the *document* is
 * at least screen-tall. A fixed <body> contributes no height, the document
 * shrinks to that shorter area, and every fixed element — the sheet, the
 * tab bar — ends a status bar's height above the bottom edge, where it then
 * stays. (See also the `html` min-height in index.css.)
 */
export function lockPageScroll(): () => void {
  locks += 1;
  if (locks === 1) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0) document.body.style.overflow = previousOverflow;
  };
}

/** True when running as an app added to the iPhone/iPad home screen. */
export const IS_IOS_STANDALONE =
  IS_IOS &&
  typeof window !== "undefined" &&
  ((navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches);
