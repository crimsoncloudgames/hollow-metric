const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

export function isLocalhostHostname(hostname: string | null | undefined): boolean {
  if (!hostname) return false;

  const normalized = normalizeHostname(hostname);

  if (normalized === "::1" || normalized.startsWith("::1:")) {
    return true;
  }

  const hostWithoutPort = normalized.split(":")[0] ?? "";
  return LOCALHOST_HOSTNAMES.has(hostWithoutPort);
}

export function shouldBypassTurnstile(options: {
  nodeEnv?: string;
  hostname?: string | null;
}): boolean {
  if (options.nodeEnv === "development") {
    return true;
  }

  return isLocalhostHostname(options.hostname);
}