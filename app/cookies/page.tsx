import Link from "next/link";
import PublicSiteHeader from "@/components/public-site-header";

type CookieSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
  contactLines?: string[];
};

const sections: CookieSection[] = [
  {
    title: "1. What This Policy Covers",
    paragraphs: [
      "This Cookie Policy explains how Hollow Metric uses cookies and similar technologies when you visit https://hollowmetric.com.",
      "It should be read together with our Privacy Policy.",
    ],
  },
  {
    title: "2. What Cookies Are",
    paragraphs: [
      "Cookies are small text files stored in your browser. They help websites remember information about your visit.",
    ],
  },
  {
    title: "3. How Hollow Metric Uses Cookies",
    paragraphs: ["We use cookies and similar technologies mainly for core product operation, including:"],
    items: [
      "keeping you signed in",
      "maintaining secure sessions",
      "remembering cookie choices and basic preferences",
      "supporting core site and product functionality",
      "maintaining basic product state between visits",
    ],
  },
  {
    title: "4. Essential Cookies",
    paragraphs: [
      "Some cookies are essential for Hollow Metric to work correctly, including login and security-related cookies.",
      "If these are blocked, parts of the service may not work as expected.",
    ],
  },
  {
    title: "5. Third-Party Services",
    paragraphs: [
      "Some cookies or similar technologies may be set by service providers we use to run the product, such as authentication, infrastructure, and payment-related providers.",
      "These providers process data under their own policies and legal obligations.",
    ],
  },
  {
    title: "6. Your Choices",
    paragraphs: [
      "You can manage cookies in your browser settings, including blocking or deleting them.",
      "Blocking certain cookies may affect sign-in, session stability, and other product functions.",
    ],
  },
  {
    title: "7. Changes to This Policy",
    paragraphs: [
      "We may update this Cookie Policy from time to time. If we make material updates, we may update the effective date and provide notice where appropriate.",
    ],
  },
  {
    title: "8. Contact",
    paragraphs: ["If you have questions about this Cookie Policy, contact:"],
    contactLines: ["Hollow Metric", "support@hollowmetric.com"],
  },
];

export default function CookiePolicyPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_65%,_rgba(30,64,175,0.18)_100%)]" />
        <div className="absolute -left-20 top-8 h-[420px] w-[420px] rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute right-[-10%] top-24 h-[340px] w-[340px] rounded-full bg-cyan-400/8 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
        <PublicSiteHeader />

        <section className="mx-auto w-full max-w-4xl py-10 sm:py-16">
          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-7 shadow-[0_0_40px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Cookie Policy</p>
            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">Cookie Policy</h1>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Effective Date: April 11, 2026</p>

            <div className="mt-10 space-y-6 text-base leading-8 text-slate-300">
              <p>This Cookie Policy explains how Hollow Metric uses cookies and similar technologies on https://hollowmetric.com.</p>
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
                <Link href="/refunds" className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 transition hover:border-blue-500 hover:text-blue-300">Refund Policy</Link>
                <Link href="/contact" className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 transition hover:border-blue-500 hover:text-blue-300">Contact Support</Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
