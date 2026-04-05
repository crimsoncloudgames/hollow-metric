import Image from "next/image";
import Link from "next/link";

type RefundSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
  trailingParagraphs?: string[];
  trailingItems?: string[];
  contactLines?: string[];
};

const sections: RefundSection[] = [
  {
    title: "1. Refund Window",
    paragraphs: [
      "Refund requests may be submitted within 7 days of purchase.",
    ],
  },
  {
    title: "2. Merchant of Record",
    paragraphs: [
      "Paddle is the merchant of record for purchases made through Hollow Metric.",
    ],
  },
  {
    title: "3. How to Request a Refund",
    paragraphs: ["To request a refund, use:"],
    items: [
      "the Paddle receipt or support link in your purchase confirmation email",
      "or Paddle buyer support",
    ],
  },
  {
    title: "4. Processing",
    paragraphs: [
      "Approved refunds are handled by Paddle in accordance with Paddle's refund process and applicable law.",
    ],
  },
  {
    title: "5. Contact",
    paragraphs: ["For refund questions, contact:"],
    contactLines: [
      "Use the Paddle receipt or support link in your purchase confirmation email.",
      "You can also contact Paddle buyer support.",
      "For product-side support questions, contact support@hollowmetric.com.",
    ],
  },
];

export default function RefundsPage() {
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
            <Link href="/contact" className="transition hover:text-blue-400">Contact</Link>
            <Link href="/login" className="transition hover:text-blue-400">Login</Link>
            <Link href="/signup" className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-500">
              Sign Up
            </Link>
          </nav>
        </header>

        <section className="mx-auto w-full max-w-4xl py-14 sm:py-16">
          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-7 shadow-[0_0_40px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Refund Policy</p>
            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">Refund Policy</h1>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Effective Date: April 2, 2026</p>

            <div className="mt-10 space-y-6 text-base leading-8 text-slate-300">
              <p>This Refund Policy explains how refund requests for Hollow Metric purchases are handled through Paddle.</p>
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

            <section className="mt-12 border-t border-slate-800/70 pt-10">
              <h2 className="text-2xl font-black text-white sm:text-3xl">Legal and Support Links</h2>
              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <Link href="/privacy" className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 transition hover:border-blue-500 hover:text-blue-300">Privacy Policy</Link>
                <Link href="/terms" className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 transition hover:border-blue-500 hover:text-blue-300">Terms of Service</Link>
                <Link href="/cookies" className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 transition hover:border-blue-500 hover:text-blue-300">Cookie Policy</Link>
                <Link href="/contact" className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 transition hover:border-blue-500 hover:text-blue-300">Contact Support</Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
