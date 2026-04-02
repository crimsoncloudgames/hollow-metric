import Image from "next/image";
import Link from "next/link";

type TermsSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
  trailingParagraphs?: string[];
  trailingItems?: string[];
  closing?: string;
  contactLines?: string[];
};

const sections: TermsSection[] = [
  {
    title: "1. The Service",
    paragraphs: [
      "Hollow Metric is a software tool for game developers. It may include budgeting tools, break-even estimation, saved project workflows, and other related features.",
      "Some features may be limited, changed, removed, or marked as coming soon.",
    ],
  },
  {
    title: "2. Eligibility",
    paragraphs: [
      "You must be legally capable of entering into a binding agreement to use Hollow Metric.",
    ],
  },
  {
    title: "3. Accounts",
    paragraphs: ["You are responsible for:"],
    items: [
      "providing accurate account information",
      "keeping your login credentials secure",
      "all activity that occurs under your account",
    ],
    closing: "You must notify us promptly at support@hollowmetric.com if you suspect unauthorized access.",
  },
  {
    title: "4. Subscription Plans and Access",
    paragraphs: [
      "Hollow Metric may offer free and paid plans. Features, limits, and access may vary by plan. We may change plans, pricing, feature limits, or availability from time to time.",
      "Where billing is handled by Paddle, Paddle may act as merchant of record for transactions.",
    ],
  },
  {
    title: "5. Payments and Billing",
    paragraphs: [
      "If you purchase a paid plan, you agree to pay all applicable fees, taxes, and charges.",
      "Billing, payment processing, and some refund handling may be managed by Paddle.",
      "If your subscription renews automatically, you authorize recurring billing unless you cancel according to the applicable terms of your plan and payment provider.",
    ],
  },
  {
    title: "6. Refund Policy",
    paragraphs: [
      "We want to be fair, but we also provide access to digital software and services.",
      "Refund requests should be sent to:",
    ],
    items: [
      "support@hollowmetric.com, and/or",
      "Paddle buyer support where applicable",
    ],
    trailingParagraphs: [
      "Where Paddle acts as merchant of record, Paddle’s buyer refund processes and applicable consumer rights may apply.",
      "Unless required by law or otherwise approved, we generally do not guarantee refunds for:",
    ],
    trailingItems: [
      "partial billing periods",
      "unused time on a subscription after cancellation",
      "dissatisfaction based on expected commercial outcomes",
      "losses arising from business decisions, pricing decisions, or launch performance",
    ],
    closing: "Nothing in this section limits any non-waivable legal rights you may have under applicable consumer law.",
  },
  {
    title: "7. No Professional, Legal, Tax, or Financial Advice",
    paragraphs: [
      "Hollow Metric provides planning tools, calculations, estimates, and informational outputs only.",
      "Hollow Metric does not provide:",
    ],
    items: [
      "legal advice",
      "tax advice",
      "accounting advice",
      "investment advice",
      "guaranteed business outcomes",
    ],
    trailingParagraphs: [
      "Break-even calculations, budget reviews, and related outputs are estimates and approximations only. Actual outcomes may vary significantly.",
    ],
    closing: "You are responsible for verifying important tax, legal, accounting, and commercial decisions with qualified professionals where needed.",
  },
  {
    title: "8. Acceptable Use",
    paragraphs: ["You agree not to:"],
    items: [
      "use the service unlawfully",
      "interfere with or disrupt the service",
      "attempt unauthorized access",
      "scrape, reverse engineer, copy, or exploit the service beyond permitted use",
      "upload malicious code or harmful content",
      "impersonate others or falsify account information",
    ],
  },
  {
    title: "9. Intellectual Property",
    paragraphs: [
      "Hollow Metric, including its software, branding, design, and content, is owned by or licensed to Hollow Metric and is protected by applicable intellectual property laws.",
      "We grant you a limited, non-exclusive, non-transferable, revocable right to use the service for your internal business or personal use in accordance with these Terms.",
    ],
  },
  {
    title: "10. Availability and Changes",
    paragraphs: [
      "We may modify, suspend, or discontinue parts of Hollow Metric at any time, including features marked as beta, preview, or coming soon.",
      "We do not guarantee uninterrupted availability.",
    ],
  },
  {
    title: "11. Disclaimers",
    paragraphs: [
      "Hollow Metric is provided on an \"as is\" and \"as available\" basis to the extent permitted by law.",
      "We do not guarantee:",
    ],
    items: [
      "that the service will always be available or error-free",
      "that outputs will be complete, accurate, or suitable for your specific situation",
      "that your project will achieve any commercial result",
    ],
  },
  {
    title: "12. Limitation of Liability",
    paragraphs: [
      "To the maximum extent permitted by law, Hollow Metric will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, lost revenue, lost data, lost business opportunities, or business interruption arising out of or related to the service.",
      "Our total liability for any claim relating to Hollow Metric will not exceed the amount you paid us for the service during the 12 months before the claim arose, or USD 100, whichever is greater, to the extent permitted by law.",
    ],
  },
  {
    title: "13. Termination",
    paragraphs: ["We may suspend or terminate access if:"],
    items: [
      "you violate these Terms",
      "your account presents legal, security, or abuse risk",
      "required by law or payment provider restrictions",
    ],
    closing: "You may stop using the service at any time. Subscription cancellation does not automatically entitle you to a refund unless required by law or expressly approved.",
  },
  {
    title: "14. Governing Law",
    paragraphs: [
      "These Terms are governed by the laws of the People's Republic of China, excluding conflict-of-law rules, unless applicable consumer law requires otherwise.",
    ],
  },
  {
    title: "15. Contact",
    paragraphs: ["Questions about these Terms can be sent to:"],
    contactLines: ["Hollow Metric", "support@hollowmetric.com"],
  },
];

export default function TermsPage() {
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
              width={300}
              height={70}
              className="h-auto w-full"
              priority
            />
            <p className="absolute bottom-[6%] left-[34%] whitespace-nowrap text-[8px] font-medium leading-none text-slate-500 sm:text-[9px] md:text-[10px]">
              A tool by Crimson Cloud Games
            </p>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <Link href="/pricing" className="transition hover:text-blue-400">Pricing</Link>
            <Link href="/resources" className="transition hover:text-blue-400">Resources</Link>
            <Link href="/contact" className="transition hover:text-blue-400">Contact</Link>
            <Link href="/login" className="transition hover:text-blue-400">Login</Link>
            <Link href="/signup" className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-500">
              Sign Up
            </Link>
          </nav>
        </header>

        <section className="mx-auto w-full max-w-4xl py-14 sm:py-16">
          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-7 shadow-[0_0_40px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Terms of Service</p>
            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">Terms of Service</h1>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Effective Date: April 2, 2026</p>

            <div className="mt-10 space-y-6 text-base leading-8 text-slate-300">
              <p>These Terms of Service govern your access to and use of Hollow Metric, operated by Hollow Metric.</p>
              <p>By accessing or using Hollow Metric, you agree to these Terms.</p>
            </div>

            <div className="mt-12 space-y-12">
              {sections.map((section) => (
                <section key={section.title} className="border-t border-slate-800/70 pt-10 first:border-t-0 first:pt-0">
                  <h2 className="text-2xl font-black text-white sm:text-3xl">{section.title}</h2>

                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                      {paragraph}
                    </p>
                  ))}

                  {section.items && (
                    <ul className="mt-5 space-y-3 text-base leading-8 text-slate-300">
                      {section.items.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.trailingParagraphs?.map((paragraph) => (
                    <p key={paragraph} className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                      {paragraph}
                    </p>
                  ))}

                  {section.trailingItems && (
                    <ul className="mt-5 space-y-3 text-base leading-8 text-slate-300">
                      {section.trailingItems.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.closing && (
                    <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">{section.closing}</p>
                  )}

                  {section.contactLines && (
                    <div className="mt-6 rounded-3xl border border-blue-600/30 bg-blue-600/8 p-6 text-base leading-8 text-slate-200">
                      {section.contactLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
