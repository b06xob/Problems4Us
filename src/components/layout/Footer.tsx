export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-alt">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <span className="text-lg font-bold text-text-primary">
                Problems<span className="text-brand-600">4Us</span>
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm text-text-secondary">
              Turn customer complaints into business opportunities. AI-powered
              opportunity discovery from Reddit, GitHub, forums, reviews, and
              social media.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Platform</h3>
            <ul className="mt-3 space-y-2">
              {[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Problem Explorer", href: "/problems" },
                { label: "Community Problems", href: "/submissions" },
                { label: "Submit a Problem", href: "/submit" },
                { label: "Product Ideas", href: "/ideas" },
                { label: "Data Sources", href: "/admin" },
              ].map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Company</h3>
            <ul className="mt-3 space-y-2">
              {["About", "Blog", "Privacy", "Terms"].map((item) => (
                <li key={item}>
                  <span className="text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6">
          <p className="text-center text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Problems4Us. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
