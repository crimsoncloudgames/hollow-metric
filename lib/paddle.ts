import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

type PaddleCheckoutOptions = {
  userId?: string;
  email?: string;
};

/**
 * Initializes Paddle.js once and reuses the same instance everywhere.
 *
 * IMPORTANT: Put your Paddle client-side token in:
 * NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
 */
export function getPaddleInstance() {
  if (!paddlePromise) {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

    if (!token) {
      console.error("Missing NEXT_PUBLIC_PADDLE_CLIENT_TOKEN environment variable.");
      paddlePromise = Promise.resolve(undefined);
      return paddlePromise;
    }

    paddlePromise = initializePaddle({
      token,
      // Keep sandbox mode for testing.
      environment: "sandbox",
    });
  }

  return paddlePromise;
}

export async function openPaddleCheckout(priceId: string, options: PaddleCheckoutOptions = {}) {
  const paddle = await getPaddleInstance();

  if (!paddle) {
    throw new Error("Paddle failed to initialize. Check client-side token env var.");
  }

  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customData: options.userId
      ? {
          supabase_user_id: options.userId,
        }
      : undefined,
    customer: options.email
      ? {
          email: options.email,
        }
      : undefined,
  });
}
