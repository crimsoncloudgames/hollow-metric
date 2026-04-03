import { shouldBypassTurnstile } from "@/lib/turnstile-bypass";

type TurnstileVerifyResponse = {
  success: boolean;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
};

type VerifyTurnstileOptions = {
  token: string;
  ip?: string;
  expectedAction?: string;
  requestHostname?: string | null;
};

type VerifyTurnstileResult = {
  ok: boolean;
  error?: string;
};

export async function verifyTurnstileToken(
  options: VerifyTurnstileOptions
): Promise<VerifyTurnstileResult> {
  if (
    shouldBypassTurnstile({
      nodeEnv: process.env.NODE_ENV,
      hostname: options.requestHostname,
    })
  ) {
    return { ok: true };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        error: "Captcha verification is unavailable. Please try again later.",
      };
    }

    return { ok: true };
  }

  const token = options.token.trim();
  if (!token) {
    return { ok: false, error: "Please complete the captcha challenge." };
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (options.ip) {
    body.set("remoteip", options.ip);
  }

  let payload: TurnstileVerifyResponse;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        cache: "no-store",
      }
    );

    payload = (await response.json()) as TurnstileVerifyResponse;
  } catch {
    return {
      ok: false,
      error: "Unable to verify captcha right now. Please try again.",
    };
  }

  if (!payload.success) {
    return {
      ok: false,
      error: "Captcha verification failed. Please try again.",
    };
  }

  if (
    options.expectedAction &&
    payload.action &&
    payload.action !== options.expectedAction
  ) {
    return {
      ok: false,
      error: "Captcha verification failed. Please refresh and try again.",
    };
  }

  return { ok: true };
}
