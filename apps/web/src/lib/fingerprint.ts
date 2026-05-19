// Cheap, browser-side device fingerprint. NOT a security primitive — just a
// stable-ish handle that helps detect ban evasion. We hash + send to the server,
// which compares against fingerprints of banned users.

let cached: string | null = null;

export function deviceFingerprint(): string {
  if (cached) return cached;
  if (typeof window === "undefined") return "";
  const parts: string[] = [
    navigator.userAgent,
    navigator.language,
    String(navigator.hardwareConcurrency ?? 0),
    String((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0),
    String(window.screen.width),
    String(window.screen.height),
    String(window.screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  // Canvas fingerprint
  try {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 60;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "16px Arial";
      ctx.fillStyle = "#102030";
      ctx.fillRect(0, 0, 200, 60);
      ctx.fillStyle = "#fff";
      ctx.fillText("yuno-fp", 4, 4);
      parts.push(c.toDataURL().slice(-200));
    }
  } catch {
    /* ignore */
  }
  cached = parts.join("|");
  return cached;
}
