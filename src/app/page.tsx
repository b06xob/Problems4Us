import Link from "next/link";
import { EmailSignup } from "@/components/home/EmailSignup";

/* ------------------------------------------------------------------ */
/*  Inline mock data                                                   */
/* ------------------------------------------------------------------ */

const steps = [
  {
    num: 1,
    title: "Collect",
    desc: "We scan Reddit, GitHub Issues, forums, review sites, and social media for customer complaints.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    num: 2,
    title: "Analyze",
    desc: "AI extracts and clusters similar pain points automatically across all sources.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6H8" />
        <path d="M12 2a4 4 0 0 1 4 4c0 2-2 3-2 6h2" />
        <path d="M8 12h8" />
        <path d="M9 16h6" />
        <path d="M10 20h4" />
      </svg>
    ),
  },
  {
    num: 3,
    title: "Score",
    desc: "Each problem gets scored on frequency, severity, willingness-to-pay, market size, and trend.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 5-10" />
      </svg>
    ),
  },
  {
    num: 4,
    title: "Act",
    desc: "Get AI-generated product ideas with MVP roadmaps and revenue estimates.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    ),
  },
];

const sources = [
  {
    name: "Reddit",
    desc: "Subreddit complaints and feature requests",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0Zm5.01 4.74c.69 0 1.25.56 1.25 1.25a1.25 1.25 0 0 1-2.08.93l-2.1.87A2.56 2.56 0 0 0 12 5.53a2.56 2.56 0 0 0-2.08 2.26l-2.1-.87a1.25 1.25 0 0 1-.83-1.18 1.25 1.25 0 1 1 1.25 1.25l2.1.87a2.56 2.56 0 0 0 0 1.28l-2.1.87a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 .83.32l2.1-.87a2.56 2.56 0 0 0 4.16 0l2.1.87a1.25 1.25 0 0 1 .83-.32 1.25 1.25 0 1 1 0 2.5l-2.1-.87a2.56 2.56 0 0 0 0-1.28l2.1-.87c.17.2.4.35.66.42v.01ZM8.5 14.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm7 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm-3.5 3c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5Z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    desc: "Open issues, feature requests, and discussions",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.3.76-1.6-2.67-.31-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6.02 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.62-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3Z" />
      </svg>
    ),
  },
  {
    name: "Forums",
    desc: "Stack Overflow, Discourse, and niche communities",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    name: "Review Sites",
    desc: "G2, Capterra, Trustpilot, and app stores",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    name: "Social Media",
    desc: "Twitter/X, LinkedIn, and Mastodon mentions",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4l11.73 16h4.27L8.27 4H4z" />
        <path d="M4 20l6.77-8.5" />
        <path d="M20 4l-6.77 8.5" />
      </svg>
    ),
  },
  {
    name: "Support Tickets",
    desc: "Zendesk, Intercom, and helpdesk exports",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
];

const scoreDimensions = [
  { label: "Frequency", pct: 25, desc: "How often the problem appears", color: "bg-brand-500" },
  { label: "Severity", pct: 25, desc: "How painful it is for customers", color: "bg-score-critical" },
  { label: "Willingness to Pay", pct: 30, desc: "Will people pay for a solution?", color: "bg-score-high" },
  { label: "Trend", pct: 10, desc: "Is the problem growing?", color: "bg-score-medium" },
  { label: "Market Size", pct: 10, desc: "How large is the addressable market?", color: "bg-blue-500" },
];

const examplePainPoints = [
  {
    title: "Azure Reserved Instance Cost Surprises",
    category: "Cloud Infrastructure",
    score: 87,
    trend: "up" as const,
    summary: "Enterprises are repeatedly blindsided by unexpected Azure RI charges, especially when usage patterns change after initial commitment. Over 340 complaints across Reddit and GitHub.",
  },
  {
    title: "Active Directory Stale Account Cleanup",
    category: "IT Operations",
    score: 73,
    trend: "stable" as const,
    summary: "IT admins struggle with identifying and safely removing inactive AD accounts. Existing tools are manual and error-prone. Cited in 200+ forum threads this quarter.",
  },
  {
    title: "QuickBooks Integration Failures",
    category: "Accounting Software",
    score: 65,
    trend: "up" as const,
    summary: "Small businesses face constant sync errors between QuickBooks and third-party apps. The official API is notoriously fragile. 180+ complaints trending upward.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helper: score badge class                                          */
/* ------------------------------------------------------------------ */

function scoreBadgeClass(score: number) {
  if (score >= 80) return "badge-critical";
  if (score >= 60) return "badge-high";
  if (score >= 40) return "badge-medium";
  return "badge-low";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  return (
    <>
      {/* ============================================================ */}
      {/*  Hero                                                        */}
      {/* ============================================================ */}
      <section className="relative isolate overflow-hidden">
        {/* decorative grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* gradient blobs */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-0 -z-10 h-[500px] w-[700px] rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-600/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-0 -z-10 h-[400px] w-[600px] rounded-full bg-brand-300/15 blur-3xl dark:bg-brand-700/10" />

        <div className="mx-auto max-w-5xl px-6 pb-24 pt-28 text-center sm:pt-36 lg:pt-44">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-400 bg-clip-text text-transparent">
              Find the problems
            </span>{" "}
            customers are already begging someone to solve.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
            Problems4Us scans Reddit, GitHub, forums, reviews, and social media
            to discover repeated customer pain points, cluster them with AI,
            score the opportunity, and suggest product ideas.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard" className="btn-primary text-base px-7 py-3">
              Start Finding Opportunities
            </Link>
            <Link href="/submit" className="btn-secondary text-base px-7 py-3">
              Submit a Problem
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  How It Works                                                */}
      {/* ============================================================ */}
      <section className="bg-surface-alt py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-text-secondary">
            Four simple steps from raw customer noise to actionable opportunity.
          </p>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.num} className="card-hover group relative text-center">
                {/* step number */}
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white shadow">
                  {s.num}
                </span>
                <div className="mt-4 flex justify-center text-brand-600">{s.icon}</div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Data Sources                                                */}
      {/* ============================================================ */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Data Sources We Monitor
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-text-secondary">
            We aggregate complaints and feature requests across every channel
            your customers use.
          </p>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((src) => (
              <div
                key={src.name}
                className="card-hover flex items-start gap-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="shrink-0 text-brand-600">{src.icon}</div>
                <div>
                  <h3 className="font-semibold">{src.name}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{src.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Opportunity Scoring                                         */}
      {/* ============================================================ */}
      <section className="bg-surface-alt py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Opportunity Scoring
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-text-secondary">
            Every pain point is scored 0–100 using a weighted formula across five
            key dimensions.
          </p>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {scoreDimensions.map((d) => (
              <div key={d.label} className="card text-center">
                <div className={`mx-auto mb-3 h-12 w-12 rounded-full ${d.color} flex items-center justify-center text-white text-lg font-bold`}>
                  {d.pct}%
                </div>
                <h3 className="font-semibold text-sm">{d.label}</h3>
                <p className="mt-1 text-xs text-text-secondary">{d.desc}</p>
              </div>
            ))}
          </div>

          {/* visual formula bar */}
          <div className="mt-10 overflow-hidden rounded-xl border border-border">
            <div className="flex h-4">
              <div className="bg-brand-500 h-full" style={{ width: "25%" }} />
              <div className="bg-score-critical h-full" style={{ width: "25%" }} />
              <div className="bg-score-high h-full" style={{ width: "30%" }} />
              <div className="bg-score-medium h-full" style={{ width: "10%" }} />
              <div className="bg-blue-500 h-full" style={{ width: "10%" }} />
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-text-muted font-medium">
            <span>Frequency 25%</span>
            <span>Severity 25%</span>
            <span>WTP 30%</span>
            <span>Trend 10%</span>
            <span>Market 10%</span>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Example Pain Points                                         */}
      {/* ============================================================ */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Example Pain Points
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-text-secondary">
            Real opportunities discovered from public customer complaints.
          </p>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {examplePainPoints.map((pp) => (
              <div key={pp.title} className="card-hover flex flex-col">
                {/* header */}
                <div className="flex items-start justify-between gap-3">
                  <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400">
                    {pp.category}
                  </span>
                  <span className={`${scoreBadgeClass(pp.score)} shrink-0`}>
                    {pp.score} · {scoreLabel(pp.score)}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-semibold leading-snug">
                  {pp.title}
                </h3>

                <p className="mt-2 flex-1 text-sm text-text-secondary leading-relaxed">
                  {pp.summary}
                </p>

                {/* trend */}
                <div className="mt-4 flex items-center gap-1.5">
                  {pp.trend === "up" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m7 17 5-5 5 5" />
                        <path d="m7 11 5-5 5 5" />
                      </svg>
                      Trending Up
                    </span>
                  )}
                  {pp.trend === "stable" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-text-muted">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                      </svg>
                      Stable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Community Submissions                                       */}
      {/* ============================================================ */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Have a problem that needs solving?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-text-secondary">
            Share your pain point with the community. Builders and entrepreneurs
            use Problems4Us to find real problems worth building products for.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/submit" className="btn-primary text-base px-7 py-3">
              Submit Your Problem
            </Link>
            <Link href="/submissions" className="btn-secondary text-base px-7 py-3">
              Browse Community Problems
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Email Signup                                                */}
      {/* ============================================================ */}
      <section className="py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Get Early Access
          </h2>
          <p className="mt-3 text-text-secondary">
            Join the waitlist and be the first to discover untapped
            opportunities.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4">
            <EmailSignup source="landing" />
            <Link
              href="/pricing"
              className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              See early-access pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Tagline Banner                                              */}
      {/* ============================================================ */}
      <section className="border-t border-border bg-gradient-to-r from-brand-600 to-emerald-500 py-16">
        <p className="mx-auto max-w-3xl px-6 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Turn customer complaints into business opportunities.
        </p>
      </section>
    </>
  );
}
