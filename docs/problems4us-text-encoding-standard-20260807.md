# Problems4Us text encoding standard

**Correlation:** cos-email-encoding-20260807  
**Effective:** 2026-08-07  
**Code:** `src/lib/mail-encoding.ts`

## Standard (one rule)

When Problems4Us emits text to an **email header**, a **file**, or an **Intercom/event payload**:

1. Prefer **ASCII** for email **subject** lines. No em dashes, en dashes, smart quotes, ellipses, or arrows.
2. If a header must carry non-ASCII, **RFC 2047**-encode it (`=?UTF-8?B?...?=`). Never put raw UTF-8 in Subject/From display structures that SMTP writes as bare header bytes.
3. Email **bodies** may use UTF-8 only when `Content-Type` explicitly declares `charset=utf-8` (SMTP and SendGrid).
4. Prefer declaring UTF-8 at the write site for JSON/files/events, or restrict the payload to ASCII. Do not rely on a downstream default charset.

## Why

Raw UTF-8 em dash (`E2 80 94`) in a subject without RFC 2047 is interpreted by many Windows clients as Windows-1252 and renders as mojibake (`a` + euro + quote). This is the third occurrence of the same encoding bug class in this product.

## Enforcement points

| Surface | Mechanism |
| --- | --- |
| SMTP `Subject:` | `encodeEmailSubjectHeader()` in `smtp-mail.ts` |
| App-built subjects | `asciiEmailSubject()` / literal ASCII hyphens at call sites |
| SendGrid body | `MAIL_PLAIN_TEXT_TYPE` = `text/plain; charset=utf-8` |
| SMTP body | already `Content-Type: text/plain; charset=utf-8` |

## Verification

Inspect the on-wire subject (ASCII hyphen, no U+2014) and the Content-Type charset in a real client or by capturing SMTP DATA — not by reading TypeScript alone.
