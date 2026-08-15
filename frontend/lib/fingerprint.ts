/**
 * Builds a stable-ish identifier for the current device/browser.
 *
 * This is a deterrent, not a security boundary: it is spoofable by anyone
 * willing to edit their user agent. It exists to make casual proxy attendance
 * ("mark me from your phone") inconvenient, and it is only one of several
 * checks the backend runs.
 *
 * Every component must be stable across sessions, otherwise a student gets
 * locked out of their own account. Notably absent: `getTimezoneOffset()`, which
 * shifts by an hour at every daylight-saving transition, and `deviceMemory`,
 * which some browsers quantise differently between releases.
 */
export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "";

  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    String(screen.colorDepth),
    String(navigator.hardwareConcurrency ?? 0),
    // IANA zone name is stable across DST changes, unlike the numeric offset.
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
  ];

  return components.join("|");
}
