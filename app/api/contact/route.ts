import { NextRequest, NextResponse } from "next/server";

type ContactPayload = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  website?: string;
};

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getRequestIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function checkRateLimit(key: string): { limited: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return { limited: false };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeText(input: string | undefined, maxLength: number): string {
  return (input ?? "").trim().slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  const ipKey = getRequestIp(request);
  const rateLimitResult = checkRateLimit(ipKey);
  if (rateLimitResult.limited) {
    return NextResponse.json(
      {
        error: "Too many messages in a short time. Please wait a few minutes and try again.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.retryAfterSeconds ?? 60),
        },
      }
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.CONTACT_FROM_EMAIL?.trim();
  const toEmail = process.env.CONTACT_TO_EMAIL?.trim() || "support@hollowmetric.com";

  if (!resendApiKey || !fromEmail) {
    return NextResponse.json(
      {
        error:
          "Contact form email provider is not configured yet. Please email support@hollowmetric.com directly for now.",
      },
      { status: 503 }
    );
  }

  let body: ContactPayload;
  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = normalizeText(body.name, 120);
  const email = normalizeText(body.email, 160).toLowerCase();
  const subject = normalizeText(body.subject, 200);
  const message = normalizeText(body.message, 5000);
  const website = normalizeText(body.website, 200);
  const resolvedSubject = subject || "New Hollow Metric Contact Form Submission";

  // Honeypot field should stay empty for real users.
  if (website) {
    return NextResponse.json({ message: "Message sent successfully." }, { status: 200 });
  }

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Please complete name, email, and message." }, { status: 400 });
  }

  if (!validateEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const emailPayload = {
    from: fromEmail,
    to: [toEmail],
    reply_to: email,
    subject: `[Hollow Metric Contact] ${resolvedSubject}`,
    text: [
      "New contact form submission",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Subject: ${resolvedSubject}`,
      "",
      "Message:",
      message,
    ].join("\n"),
  };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Unable to send your message right now. Please email support@hollowmetric.com directly.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: "Message sent successfully." }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to send your message right now. Please email support@hollowmetric.com directly.",
      },
      { status: 500 }
    );
  }
}
