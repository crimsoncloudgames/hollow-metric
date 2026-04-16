import Link from "next/link";
import PublicSiteHeader from "@/components/public-site-header";

type PrivacySectionGroup = {
  heading: string;
  intro: string;
  items?: string[];
};

type PrivacySection = {
  title: string;
  paragraphs?: string[];
  groups?: PrivacySectionGroup[];
  items?: string[];
  closing?: string;
  contactLines?: string[];
};

const sections: PrivacySection[] = [
  {
    title: "1. Information We Collect",
    paragraphs: [
      "We may collect the following information:",
    ],
    groups: [
      {
        heading: "Account Information",
        intro: "When you create an account, we may collect:",
        items: [
          "your email address",
          "your password or authentication credentials",
          "your subscription or account status",
        ],
      },
      {
        heading: "Product Data",
        intro: "When you use Hollow Metric, we may collect and store:",
        items: [
          "launch budget inputs",
          "pricing assumptions",
          "break-even calculations",
          "saved launch budget projects",
          "post-launch actuals and related performance inputs",
          "settings and preferences",
        ],
      },
      {
        heading: "Payment Information",
        intro: "Payments and subscription billing are handled by Paddle, our payment provider and merchant of record. We do not store your full payment card details ourselves.",
      },
      {
        heading: "Technical Information",
        intro: "We may collect limited technical information needed to operate, secure, and troubleshoot the service, such as:",
        items: [
          "IP address",
          "browser type",
          "device information",
          "login and session activity",
          "cookies or similar technologies used to keep you signed in and operate the service",
        ],
      },
    ],
  },
  {
    title: "2. How We Use Information",
    paragraphs: ["We use your information to:"],
    items: [
      "provide and operate Hollow Metric",
      "create and manage your account",
      "process subscriptions and billing",
      "save your budgets, projects, and settings",
      "provide support",
      "improve product functionality, stability, and security",
      "detect fraud, abuse, or unauthorized access",
      "comply with legal obligations",
    ],
  },
  {
    title: "3. Payments",
    paragraphs: [
      "Payments for Hollow Metric are processed by Paddle. Paddle may collect and process billing and payment data in accordance with its own privacy practices and legal obligations.",
    ],
  },
  {
    title: "4. Cookies and Similar Technologies",
    paragraphs: ["We use cookies and similar technologies to:"],
    items: [
      "keep you signed in",
      "maintain secure sessions",
      "remember preferences",
      "support core site functionality",
    ],
    closing: "Some cookies and similar technologies are essential to provide the service you request, such as login, session, and security-related cookies.",
  },
  {
    title: "5. How We Share Information",
    paragraphs: ["We do not sell your personal information.", "We may share limited information with:"],
    items: [
      "service providers that help us operate the product",
      "payment providers such as Paddle",
      "hosting, infrastructure, authentication, or database providers",
      "legal authorities when required by law",
      "advisers or acquirers in connection with a merger, sale, or restructuring",
    ],
  },
  {
    title: "6. Data Retention",
    paragraphs: [
      "We keep information for as long as reasonably necessary to provide the service, maintain security, comply with legal obligations, resolve disputes, and enforce our agreements.",
      "If you delete your account, we may delete or anonymize your data, except where retention is required for legal, tax, fraud-prevention, or legitimate operational reasons.",
    ],
  },
  {
    title: "7. Data Security",
    paragraphs: [
      "We take reasonable technical and organizational steps to protect information. However, no system can be guaranteed 100% secure.",
    ],
  },
  {
    title: "8. Your Rights",
    paragraphs: ["Depending on where you live, you may have rights to:"],
    items: [
      "access your personal data",
      "correct inaccurate data",
      "request deletion",
      "object to certain processing",
      "request a copy of your data",
    ],
    closing: "To make a request, contact us at support@hollowmetric.com.",
  },
  {
    title: "9. Children",
    paragraphs: [
      "Hollow Metric is not intended for children under 13, and we do not knowingly collect personal data from children.",
    ],
  },
  {
    title: "10. International Use",
    paragraphs: [
      "If you use Hollow Metric from outside the country where our systems or providers operate, your information may be processed in other countries.",
    ],
  },
  {
    title: "11. Changes to This Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. If we make material changes, we may update the effective date and, where appropriate, provide additional notice.",
    ],
  },
  {
    title: "12. Contact",
    paragraphs: ["If you have questions about this Privacy Policy, contact:"],
    contactLines: ["Hollow Metric", "support@hollowmetric.com"],
  },
];

export default function PrivacyPage() {
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
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Privacy Policy</p>
            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">Privacy Policy</h1>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Effective Date: April 11, 2026</p>

            <div className="mt-10 space-y-6 text-base leading-8 text-slate-300">
              <p>Hollow Metric (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates Hollow Metric, a web-based software tool for game developers available at https://hollowmetric.com.</p>
              <p>This Privacy Policy explains what information we collect, how we use it, and the choices you have.</p>
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

                  {section.groups?.map((group) => (
                    <div key={group.heading} className="mt-7 rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                      <h3 className="text-lg font-black text-white">{group.heading}</h3>
                      <p className="mt-3 text-base leading-8 text-slate-300">{group.intro}</p>
                      {group.items && (
                        <ul className="mt-4 space-y-3 text-base leading-8 text-slate-300">
                          {group.items.map((item) => (
                            <li key={item} className="flex items-start gap-3">
                              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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

            <section className="mt-12 border-t border-slate-800/70 pt-10">
              <h2 className="text-2xl font-black text-white sm:text-3xl">Legal and Support Links</h2>
              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <Link href="/terms" className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 transition hover:border-blue-500 hover:text-blue-300">Terms of Service</Link>
                <Link href="/refunds" className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 transition hover:border-blue-500 hover:text-blue-300">Refund Policy</Link>
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
