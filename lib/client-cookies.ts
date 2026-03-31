export function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookiePairs = document.cookie.split(";").map((part) => part.trim());
  for (const pair of cookiePairs) {
    if (!pair) continue;
    const splitIndex = pair.indexOf("=");
    if (splitIndex < 0) continue;
    const key = pair.slice(0, splitIndex).trim();
    if (key !== name) continue;

    const value = pair.slice(splitIndex + 1);
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

export function setCookieValue(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax; Secure`;
}
