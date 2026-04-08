"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { shouldBypassTurnstile } from "@/lib/turnstile-bypass";

type ContactFormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
};

type ContactFieldErrors = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContactForm(formState: ContactFormState): ContactFieldErrors {
  const nextErrors: ContactFieldErrors = {};
  const trimmedName = formState.name.trim();
  const trimmedEmail = formState.email.trim();
  const trimmedSubject = formState.subject.trim();
  const trimmedMessage = formState.message.trim();

  if (!trimmedName) {
    nextErrors.name = "Enter your name.";
  }

  if (!trimmedEmail) {
    nextErrors.email = "Enter your email address.";
  } else if (!emailPattern.test(trimmedEmail)) {
    nextErrors.email = "Enter a valid email address.";
  }

  if (!trimmedSubject) {
    nextErrors.subject = "Enter a subject.";
  }

  if (!trimmedMessage) {
    nextErrors.message = "Enter your message.";
  }

  return nextErrors;
}

function getFriendlyContactErrorMessage(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("captcha")) {
    return "Please complete the captcha challenge again and resubmit the form.";
  }

  if (normalizedMessage.includes("email") && normalizedMessage.includes("invalid")) {
    return "Enter a valid email address before sending your message.";
  }

  if (normalizedMessage.includes("too many requests")) {
    return "Too many contact requests were sent. Please wait a moment and try again.";
  }

  if (normalizedMessage.includes("network") || normalizedMessage.includes("fetch")) {
    return "We couldn't send your message right now. Please check your connection and try again.";
  }

  return "Unable to send your message right now. Please try again.";
}

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetNonce, setTurnstileResetNonce] = useState(0);
  const isTurnstileEnabled =
    Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()) &&
    !shouldBypassTurnstile({
      nodeEnv: process.env.NODE_ENV,
      hostname: typeof window === "undefined" ? null : window.location.hostname,
    });
  const [formState, setFormState] = useState<ContactFormState>({
    name: "",
    email: "",
    subject: "",
    message: "",
    website: "",
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setStatusMessage(null);
    setStatusType(null);

    const nextFieldErrors = validateContactForm(formState);
    setFieldErrors(nextFieldErrors);

    if (
      nextFieldErrors.name ||
      nextFieldErrors.email ||
      nextFieldErrors.subject ||
      nextFieldErrors.message
    ) {
      setStatusType("error");
      setStatusMessage("Please fix the highlighted fields and try again.");
      return;
    }

    if (isTurnstileEnabled && !turnstileToken) {
      setStatusType("error");
      setStatusMessage("Please complete the captcha challenge.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      ...formState,
      name: formState.name.trim(),
      email: formState.email.trim(),
      subject: formState.subject.trim(),
      message: formState.message.trim(),
      turnstileToken: turnstileToken ?? "",
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawResponse = await response.text();
      let responsePayload: { error?: string; message?: string } | null = null;

      if (rawResponse) {
        try {
          responsePayload = JSON.parse(rawResponse) as { error?: string; message?: string };
        } catch {
          responsePayload = null;
        }
      }

      if (!response.ok) {
        const fallbackMessage =
          responsePayload?.error ??
          responsePayload?.message ??
          rawResponse.trim() ??
          "";

        if (fallbackMessage.toLowerCase().includes("captcha")) {
          setTurnstileToken(null);
          setTurnstileResetNonce((value) => value + 1);
        }

        setStatusType("error");
        setStatusMessage(getFriendlyContactErrorMessage(fallbackMessage));
        return;
      }

      setStatusType("success");
      setStatusMessage(responsePayload?.message ?? "Message sent successfully.");
      setFormState({ name: "", email: "", subject: "", message: "", website: "" });
      setFieldErrors({});
      setTurnstileToken(null);
      setTurnstileResetNonce((value) => value + 1);
    } catch (error) {
      setStatusType("error");
      setStatusMessage(
        getFriendlyContactErrorMessage(error instanceof Error ? error.message : "")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_65%,_rgba(30,64,175,0.18)_100%)]" />
        <div className="absolute -left-20 top-8 h-[420px] w-[420px] rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute right-[-10%] top-24 h-[340px] w-[340px] rounded-full bg-cyan-400/8 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 mt-4 flex items-center justify-between rounded-full border border-slate-800/80 bg-slate-950/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <Link href="/landing" className="relative inline-block w-[min(62vw,18rem)] sm:w-[min(44vw,19rem)] md:w-[18rem]">
            <Image
              src="/HM logo icon with text webP.webp"
              alt="Hollow Metric"
              width={1200}
              height={300}
              style={{ width: "100%", height: "auto" }}
              priority
            />
            <p className="absolute bottom-[6%] left-[34%] whitespace-nowrap text-[8px] font-medium leading-none text-slate-500 sm:text-[9px] md:text-[10px]">
              A tool by Crimson Cloud Games
            </p>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <Link href="/pricing" className="transition hover:text-blue-400">Pricing</Link>
            <Link href="/resources" className="transition hover:text-blue-400">Resources</Link>
            <Link href="/contact" className="text-blue-300 transition hover:text-blue-200">Contact</Link>
            <Link href="/login" className="transition hover:text-blue-400">Login</Link>
            <Link href="/signup" className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-500">
              Sign Up
            </Link>
          </nav>
          <div className="flex items-center gap-3 md:hidden">
            <Link href="/contact" className="text-sm font-semibold text-blue-300">Contact</Link>
            <Link href="/login" className="text-sm font-semibold text-slate-200">Login</Link>
            <Link href="/signup" className="rounded-full border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-300">Sign Up</Link>
          </div>
        </header>

        <section className="mx-auto w-full max-w-5xl py-14 sm:py-16">
          <div className="mb-10 max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Get in touch</p>
            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">Contact</h1>
            <p className="mt-4 text-lg leading-8 text-slate-300">Questions, support requests, or business inquiries? Get in touch.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-7 shadow-[0_0_40px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-busy={isSubmitting}>
                <div className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
                  <label htmlFor="contact-website">Website</label>
                  <input
                    id="contact-website"
                    name="website"
                    type="text"
                    autoComplete="off"
                    tabIndex={-1}
                    value={formState.website}
                    onChange={(event) => setFormState((prev) => ({ ...prev, website: event.target.value }))}
                  />
                </div>

                <div>
                  <label htmlFor="contact-name" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Name</label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    value={formState.name}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, name: event.target.value }));
                      setStatusMessage(null);
                      setStatusType(null);

                      if (fieldErrors.name) {
                        setFieldErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    placeholder="Your name"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  {fieldErrors.name && (
                    <p id="contact-name-error" className="mt-2 text-sm text-red-200" role="alert">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-email" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Email</label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    value={formState.email}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, email: event.target.value }));
                      setStatusMessage(null);
                      setStatusType(null);

                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  {fieldErrors.email && (
                    <p id="contact-email-error" className="mt-2 text-sm text-red-200" role="alert">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-subject" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Subject</label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    required
                    value={formState.subject}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, subject: event.target.value }));
                      setStatusMessage(null);
                      setStatusType(null);

                      if (fieldErrors.subject) {
                        setFieldErrors((prev) => ({ ...prev, subject: undefined }));
                      }
                    }}
                    placeholder="What do you need help with?"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.subject)}
                    aria-describedby={fieldErrors.subject ? "contact-subject-error" : undefined}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  {fieldErrors.subject && (
                    <p id="contact-subject-error" className="mt-2 text-sm text-red-200" role="alert">
                      {fieldErrors.subject}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-message" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Message</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={6}
                    value={formState.message}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, message: event.target.value }));
                      setStatusMessage(null);
                      setStatusType(null);

                      if (fieldErrors.message) {
                        setFieldErrors((prev) => ({ ...prev, message: undefined }));
                      }
                    }}
                    placeholder="Tell us what you need and we’ll get back to you."
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.message)}
                    aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
                    className="w-full resize-y rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  {fieldErrors.message && (
                    <p id="contact-message-error" className="mt-2 text-sm text-red-200" role="alert">
                      {fieldErrors.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>

                <TurnstileWidget
                  action="contact_form"
                  onTokenChange={setTurnstileToken}
                  resetNonce={turnstileResetNonce}
                  className="pt-1"
                />

                {statusMessage && (
                  <p
                    role={statusType === "error" ? "alert" : "status"}
                    className={[
                      "rounded-2xl px-4 py-3 text-sm",
                      statusType === "error"
                        ? "border border-red-600/35 bg-red-600/10 text-red-200"
                        : "border border-blue-600/35 bg-blue-600/10 text-blue-200",
                    ].join(" ")}
                  >
                    {statusMessage}
                  </p>
                )}
              </form>
            </article>

            <aside className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-7 shadow-[0_0_36px_rgba(15,23,42,0.4)] backdrop-blur-xl sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Support</p>
              <h2 className="mt-3 text-2xl font-black text-white">Support</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                For support, billing, or general questions, contact:
              </p>
              <p className="mt-3 text-sm font-semibold text-blue-300">support@hollowmetric.com</p>
              <p className="mt-4 text-xs text-slate-500">We’ll respond as soon as we can.</p>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
