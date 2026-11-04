"use client";

import { RotateCcw } from "lucide-react";

export default function ErrorPage({ retry }) {
  return (
    <div className="mx-auto mt-16 max-w-lg border-t-2 border-seal pt-6">
      <h1 className="font-display text-2xl font-bold">The dashboard couldn&apos;t load</h1>
      <p className="mt-2 text-muted">Something went wrong on the server. Try again, and if it keeps happening, check the site logs.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-medium text-moss-ink"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}
