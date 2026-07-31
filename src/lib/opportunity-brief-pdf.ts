/**
 * Minimal PDF exporter for opportunity briefs (problems4us-15b).
 * Pure TypeScript — no native PDF dependency. Helvetica text only.
 */

import {
  formatOpportunityBriefMarkdown,
  type BriefIdea,
  type BriefPainPoint,
} from "./opportunity-brief";

function escapePdfText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function wrapLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];
  const out: string[] = [];
  let rest = line;
  while (rest.length > maxChars) {
    let breakAt = rest.lastIndexOf(" ", maxChars);
    if (breakAt < maxChars / 2) breakAt = maxChars;
    out.push(rest.slice(0, breakAt));
    rest = rest.slice(breakAt).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

/** Convert brief markdown into printable plain lines (strip light MD). */
export function briefMarkdownToPdfLines(markdown: string): string[] {
  const lines: string[] = [];
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw
      .replace(/^#{1,6}\s+/, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/^\|[\s-|]+\|$/, "")
      .replace(/^\|/, "")
      .replace(/\|$/g, "")
      .replace(/\|/g, "  ")
      .replace(/^---+$/, "")
      .trimEnd();
    if (!line.trim()) {
      lines.push("");
      continue;
    }
    for (const wrapped of wrapLine(line, 92)) {
      lines.push(wrapped);
    }
  }
  return lines;
}

function utf8Bytes(s: string): Uint8Array {
  // Prefer Buffer in Node/Jest; TextEncoder in Edge/browser runtimes.
  if (typeof Buffer !== "undefined") {
    return Buffer.from(s, "utf8");
  }
  return new TextEncoder().encode(s);
}

/**
 * Build a single-page-or-multi simple PDF (A4-ish) from text lines.
 * Returns Uint8Array suitable for HTTP application/pdf responses.
 */
export function buildSimpleTextPdf(
  lines: string[],
  title = "Opportunity brief"
): Uint8Array {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 48;
  const fontSize = 10;
  const lineHeight = 13;
  const usableHeight = pageHeight - margin * 2;
  const linesPerPage = Math.max(1, Math.floor(usableHeight / lineHeight));

  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([title]);

  const objects: string[] = [];

  function addObject(body: string): number {
    const id = objects.length + 1;
    objects.push(body);
    return id;
  }

  const catalogId = addObject(""); // placeholder
  const pagesId = addObject(""); // placeholder
  const fontId = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  );

  const pageIds: number[] = [];
  const contentIds: number[] = [];

  for (const pageLines of pages) {
    const y = pageHeight - margin - fontSize;
    const contentOps: string[] = [
      "BT",
      `/F1 ${fontSize} Tf`,
      `${margin} ${y} Td`,
      `${lineHeight} TL`,
    ];
    let first = true;
    for (const line of pageLines) {
      const text = escapePdfText(line.length ? line : " ");
      if (first) {
        contentOps.push(`(${text}) Tj`);
        first = false;
      } else {
        contentOps.push(`T* (${text}) Tj`);
      }
    }
    contentOps.push("ET");
    const stream = contentOps.join("\n");
    const streamLen = utf8Bytes(stream).length;
    const contentId = addObject(
      `<< /Length ${streamLen} >>\nstream\n${stream}\nendstream`
    );
    contentIds.push(contentId);
    const pageId = addObject(""); // placeholder
    pageIds.push(pageId);
  }

  // Fill page objects
  for (let i = 0; i < pageIds.length; i++) {
    objects[pageIds[i] - 1] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Contents ${contentIds[i]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;
  }

  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

  // Assemble with xref
  const chunks: Uint8Array[] = [];
  let offset = 0;

  function pushStr(s: string) {
    const bytes = utf8Bytes(s);
    chunks.push(bytes);
    offset += bytes.length;
  }

  pushStr("%PDF-1.4\n");
  const xrefOffsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    xrefOffsets.push(offset);
    pushStr(`${i + 1} 0 obj\n${objects[i]}\nendobj\n`);
  }
  const xrefStart = offset;
  pushStr(`xref\n0 ${objects.length + 1}\n`);
  pushStr("0000000000 65535 f \n");
  for (let i = 1; i <= objects.length; i++) {
    pushStr(`${String(xrefOffsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  pushStr(
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  );

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

export function formatOpportunityBriefPdf(
  painPoint: BriefPainPoint,
  ideas: BriefIdea[] = []
): Uint8Array {
  const markdown = formatOpportunityBriefMarkdown(painPoint, ideas);
  const lines = briefMarkdownToPdfLines(markdown);
  return buildSimpleTextPdf(lines, painPoint.Title);
}
