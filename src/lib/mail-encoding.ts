/**
 * Outbound text encoding standard (cos-email-encoding-20260807).
 *
 * Rule for every Problems4Us emit to email headers, files, or Intercom events:
 * - Prefer ASCII for email SUBJECT lines (no em dashes, smart quotes, ellipses).
 * - If a header must carry non-ASCII, RFC 2047-encode it (never raw UTF-8 bytes).
 * - Bodies may use UTF-8 only when Content-Type declares charset=utf-8 explicitly.
 */

/** SendGrid / MIME plain-text body type — charset must always be declared. */
export const MAIL_PLAIN_TEXT_TYPE = "text/plain; charset=utf-8";

const TYPOGRAPHY_TO_ASCII: ReadonlyArray<readonly [RegExp, string]> = [
  [/\u2014/g, "-"], // em dash
  [/\u2013/g, "-"], // en dash
  [/\u2018|\u2019/g, "'"], // curly single quotes
  [/\u201C|\u201D/g, '"'], // curly double quotes
  [/\u2026/g, "..."], // ellipsis
  [/\u2190/g, "<-"],
  [/\u2192/g, "->"],
  [/\u2194/g, "<->"],
  [/\u00A0/g, " "], // nbsp
];

/** Fold common typography to ASCII. Safe for subjects and audit of any emit. */
export function foldTypographyToAscii(text: string): string {
  let out = text;
  for (const [re, rep] of TYPOGRAPHY_TO_ASCII) {
    out = out.replace(re, rep);
  }
  return out;
}

/**
 * Subject lines: ASCII only. Typography folded; residual non-ASCII stripped.
 * Transactional subjects gain nothing from typographic punctuation and risk mojibake.
 */
export function asciiEmailSubject(raw: string): string {
  return foldTypographyToAscii(raw)
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rfc2047Base64Word(utf8Text: string): string {
  const b64 = Buffer.from(utf8Text, "utf8").toString("base64");
  // Keep encoded-words reasonably short (RFC 2047 suggests <=75 chars per word).
  const chunks: string[] = [];
  for (let i = 0; i < b64.length; i += 60) {
    chunks.push(`=?UTF-8?B?${b64.slice(i, i + 60)}?=`);
  }
  return chunks.join(" ");
}

/**
 * Value for an SMTP Subject: header.
 * Prefers ASCII after typography fold; otherwise RFC 2047 B-encoding.
 */
export function encodeEmailSubjectHeader(raw: string): string {
  const folded = foldTypographyToAscii(raw);
  if (/^[\x20-\x7E]*$/.test(folded)) {
    return folded;
  }
  return rfc2047Base64Word(folded);
}

/** True when a subject still contains non-ASCII (pre-sanitize audit helper). */
export function subjectHasNonAscii(raw: string): boolean {
  return /[^\x00-\x7F]/.test(raw);
}
