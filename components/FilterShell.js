"use client";

import { createContext, use, useTransition } from "react";

const FilterContext = createContext(null);
export const useFilterTransition = () => use(FilterContext);

/** Owns the one transition behind filter changes and Refresh, so there's a single loading indicator. */
export function FilterShell({ children }) {
  const [pending, startTransition] = useTransition();
  return (
    <FilterContext value={{ pending, startTransition }}>
      {pending ? (
        <div role="status" aria-label="Updating" className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-moss-soft">
          <div className="progress-bar h-full w-1/3 bg-moss" />
        </div>
      ) : null}
      {children}
    </FilterContext>
  );
}

export function FilterContent({ children }) {
  const { pending } = useFilterTransition();
  return (
    <div aria-busy={pending} className={`transition-opacity duration-200 ${pending ? "opacity-50" : ""}`}>
      {children}
    </div>
  );
}
