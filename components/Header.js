import Link from "next/link";
import { BRAND } from "@/lib/config";

export default function Header() {
  return (
    <header className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 pt-6 pb-5 sm:px-8">
      <Link href="/" className="group flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-[6px] bg-seal font-display text-xl font-bold text-paper"
        >
          植
        </span>
        <span className="leading-tight">
          <span className="block font-display text-2xl font-bold tracking-tight group-hover:text-moss">{BRAND}</span>
          <span className="block text-xs text-muted">Bangladesh · Meta Ads performance</span>
        </span>
      </Link>
      <span className="flex items-center gap-2 text-sm text-muted">
        <span aria-hidden="true" className="breathe size-2 rounded-full bg-moss" />
        Live data
      </span>
    </header>
  );
}
