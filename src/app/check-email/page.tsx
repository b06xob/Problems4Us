"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CheckEmailBody() {
  const search = useSearchParams();
  const email = search.get("email") || "";
  const nextPath = search.get("next") || "/problems";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-text-primary">Check your email</h1>
      <p className="mt-2 text-sm text-text-secondary">
        {email
          ? `If ${email} can be used, we sent a verification link. Confirm within 24 hours.`
          : "If this email can be used, we sent a verification link. Confirm within 24 hours."}
      </p>
      <p className="mt-4 text-sm text-text-secondary">
        Until verified you can browse and save ideas, but password reset and
        paid Builder access require a confirmed address.
      </p>
      <div className="mt-8 space-y-3 text-sm">
        <Link
          href={`/resend-verification`}
          className="block text-brand-600 hover:underline"
        >
          Resend verification email
        </Link>
        <Link
          href={nextPath.startsWith("/") ? nextPath : "/problems"}
          className="block text-brand-600 hover:underline"
        >
          Continue browsing
        </Link>
        <Link href="/login" className="block text-text-secondary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-12 text-text-secondary">
          Loading…
        </div>
      }
    >
      <CheckEmailBody />
    </Suspense>
  );
}
