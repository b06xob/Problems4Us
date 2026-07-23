"use client";

import { useState } from "react";

export function ShareBriefCopyButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="btn-primary" onClick={handleCopy}>
      {copied ? "Copied markdown" : "Copy markdown"}
    </button>
  );
}
