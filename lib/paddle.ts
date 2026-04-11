import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

const CLIENT_TOKEN_PATTERN = /^(test|live)_[A-Za-z0-9]{27}$/;

type PaddleCheckoutOptions = {
  userId?: string;
  email?: string;
  planKey?: string;
  successUrl?: string;
};

function getPaddleEnvironment() {
  const normalizedEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENV?.trim().toLowerCase();

  return normalizedEnvironment === "production" || normalizedEnvironment === "live"
    ? "production"
    : "sandbox";
}

function getValidatedClientToken() {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();

  if (!token) {
    throw new Error("Missing NEXT_PUBLIC_PADDLE_CLIENT_TOKEN environment variable.");
  }

  if (!CLIENT_TOKEN_PATTERN.test(token)) {
    throw new Error(
      "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN must be a Paddle client-side token starting with test_ or live_.",
    );
  }

  const environment = getPaddleEnvironment();
  const expectedPrefix = environment === "production" ? "live_" : "test_";

  if (!token.startsWith(expectedPrefix)) {
    throw new Error(
      `Paddle token/environment mismatch. Expected a ${expectedPrefix} token for ${environment}.`,
    );
  }

  return token;
}

/**
 * Initializes Paddle.js once and reuses the same instance everywhere.
 *
 * IMPORTANT: Put your Paddle client-side token in:
 * NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
 */
export function getPaddleInstance() {
  if (!paddlePromise) {
    let token: string;

    try {
      token = getValidatedClientToken();
    } catch (error) {
      console.error(error);
      paddlePromise = Promise.resolve(undefined);
      return paddlePromise;
    }

    paddlePromise = initializePaddle({
      token,
      environment: getPaddleEnvironment(),
      debug: process.env.NODE_ENV !== "production",
      eventCallback(event) {
        if (event.type === "checkout.error") {
          console.error("Paddle checkout error", event);
        }
      },
    });
  }

  return paddlePromise;
}

export async function openPaddleCheckout(priceId: string, options: PaddleCheckoutOptions = {}) {
  const paddle = await getPaddleInstance();
  const normalizedPriceId = priceId.trim();
  const normalizedEmail = options.email?.trim();
  const normalizedPlanKey = options.planKey?.trim();
  const normalizedSuccessUrl = options.successUrl?.trim();

  if (!paddle) {
    throw new Error("Paddle failed to initialize. Check client-side token env var.");
  }

  if (!normalizedPriceId) {
    throw new Error("Missing Paddle price ID.");
  }

  paddle.Checkout.open({
    items: [{ priceId: normalizedPriceId, quantity: 1 }],
    settings: normalizedSuccessUrl
      ? {
          successUrl: normalizedSuccessUrl,
        }
      : undefined,
    customData:
      options.userId || normalizedPlanKey
        ? {
            ...(options.userId
              ? {
                  supabase_user_id: options.userId,
                }
              : {}),
            ...(normalizedPlanKey
              ? {
                  plan_key: normalizedPlanKey,
                }
              : {}),
          }
        : undefined,
    customer: normalizedEmail
      ? {
          email: normalizedEmail,
        }
      : undefined,
  });
}
