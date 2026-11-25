import { IS_IOS } from "./ios";

/**
 * A light tap of the phone's haptic engine, for the moments a native app
 * would give one: switching tabs, ticking something off, a gesture that
 * commits.
 *
 * Android and other browsers with the Vibration API get a 10ms pulse.
 * Safari has no such API, but since iOS 18 toggling a native `switch`
 * checkbox plays the system haptic — so a hidden one is toggled through its
 * label. It only fires inside a user gesture (a tap, the end of a swipe),
 * which is the only time this is called. Older iOS: silently nothing.
 */
export function haptic() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function" && !IS_IOS) {
      navigator.vibrate(10);
      return;
    }
    if (!IS_IOS || typeof document === "undefined") return;
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.display = "none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.appendChild(input);
    document.head.appendChild(label);
    label.click();
    label.remove();
  } catch {
    // Feedback is a nicety; never let it break the action it decorates.
  }
}
