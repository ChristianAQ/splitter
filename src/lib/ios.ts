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
let lockedAtY = 0;
let previousBodyStyle: Partial<CSSStyleDeclaration> = {};

/**
 * Stops the page behind a sheet from scrolling. Returns the function that
 * releases it; nested locks (a confirm dialog over a sheet) are counted.
 *
 * On iOS `overflow: hidden` on <body> isn't enough: the document can still
 * be scrolled by WebKit itself when the keyboard opens, and that scroll is
 * what gets left behind when it closes. Taking <body> out of the flow with
 * `position: fixed` leaves nothing that *can* scroll; the offset keeps the
 * page looking exactly where it was.
 */
export function lockPageScroll(): () => void {
  locks += 1;
  if (locks === 1) {
    const body = document.body;
    lockedAtY = window.scrollY;
    previousBodyStyle = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    if (!IS_IOS) {
      body.style.overflow = "hidden";
    } else {
      // No `overflow: hidden` here: <body> is exactly one screen tall
      // (index.css), so clipping it would cut off everything below the
      // first screenful of the page showing through behind the sheet.
      body.style.position = "fixed";
      body.style.top = `${-lockedAtY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
    }
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks > 0) return;
    Object.assign(document.body.style, previousBodyStyle);
    if (IS_IOS) window.scrollTo(0, lockedAtY);
  };
}

/** Where the page is "really" scrolled to, lock or no lock. */
export function pageScrollY(): number {
  return locks > 0 && IS_IOS ? lockedAtY : window.scrollY;
}
