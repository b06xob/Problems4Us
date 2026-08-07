/**
 * @jest-environment node
 */
import {
  asciiEmailSubject,
  encodeEmailSubjectHeader,
  foldTypographyToAscii,
  MAIL_PLAIN_TEXT_TYPE,
  subjectHasNonAscii,
} from "@/lib/mail-encoding";

describe("mail-encoding (cos-email-encoding-20260807)", () => {
  it("declares utf-8 on plain text content type", () => {
    expect(MAIL_PLAIN_TEXT_TYPE).toBe("text/plain; charset=utf-8");
  });

  it("folds em dash subjects to ASCII hyphens (founder mojibake class)", () => {
    expect(
      asciiEmailSubject("We received your problem — sub-1786060494375-0eqmvj")
    ).toBe("We received your problem - sub-1786060494375-0eqmvj");
    expect(
      asciiEmailSubject("Your problem is live — sub-1786060515810-utxl2i")
    ).toBe("Your problem is live - sub-1786060515810-utxl2i");
    expect(
      asciiEmailSubject(
        "Confirm your email to keep your problem live — sub-abc"
      )
    ).toBe("Confirm your email to keep your problem live - sub-abc");
  });

  it("folds smart quotes and ellipses", () => {
    expect(foldTypographyToAscii("She said \u201Chello\u201D\u2026")).toBe(
      'She said "hello"...'
    );
    expect(asciiEmailSubject("Choose — “privacy”")).toBe('Choose - "privacy"');
  });

  it("detects non-ASCII before sanitize", () => {
    expect(subjectHasNonAscii("live — id")).toBe(true);
    expect(subjectHasNonAscii("live - id")).toBe(false);
  });

  it("SMTP subject header stays ASCII after fold", () => {
    const header = encodeEmailSubjectHeader(
      "Your problem is live — sub-1786060515810-utxl2i"
    );
    expect(header).toBe("Your problem is live - sub-1786060515810-utxl2i");
    expect(/[^\x20-\x7E]/.test(header)).toBe(false);
  });

  it("RFC 2047 B-encodes residual non-ASCII after fold", () => {
    const header = encodeEmailSubjectHeader("Café special");
    expect(header.startsWith("=?UTF-8?B?")).toBe(true);
    expect(header.endsWith("?=")).toBe(true);
    expect(header.includes("Café")).toBe(false);
  });
});
