import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { readFileSync } from "fs";
import { join } from "path";

describe("aeo-baseline", () => {
  it("robots.txt allows public crawl and points at sitemap", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://problems4us.com/sitemap.xml");
    expect(result.host).toBe("https://problems4us.com");
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toEqual(
      expect.arrayContaining(["/api/", "/admin", "/login", "/register"]),
    );
  });

  it("sitemap covers confirmed public indexable routes and excludes dashboard", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toEqual(
      expect.arrayContaining([
        "https://problems4us.com/",
        "https://problems4us.com/problems",
        "https://problems4us.com/pricing",
        "https://problems4us.com/submissions",
        "https://problems4us.com/ideas",
        "https://problems4us.com/submit",
      ]),
    );
    expect(urls).not.toEqual(
      expect.arrayContaining([
        "https://problems4us.com/dashboard",
        "https://problems4us.com/login",
        "https://problems4us.com/admin",
      ]),
    );
  });

  it("llms.txt ships with canonical facts and do-not-invent clause", () => {
    const text = readFileSync(
      join(process.cwd(), "public", "llms.txt"),
      "utf8",
    );
    expect(text).toContain("# Problems4Us");
    expect(text).toContain("https://problems4us.com/");
    expect(text).toMatch(/Do not invent/i);
    expect(text).toContain("Builder Early Access");
    expect(text).toContain("$49");
  });
});
