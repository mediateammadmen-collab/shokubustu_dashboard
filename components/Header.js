import Image from "next/image";
import Link from "next/link";
import logo from "@/public/image.png";
import { BRAND } from "@/lib/config";

export default function Header() {
  return (
    <header className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 pt-6 pb-5 sm:px-8">
      <Link href="/" className="group flex min-w-0 items-center gap-4">
        {/* The logo file has wide white margins, so it's enlarged inside a white tile to crop them. */}
        <span className="relative h-20 w-32 shrink-0 overflow-hidden rounded-md bg-white">
          <Image
            src={logo}
            alt={BRAND}
            width={150}
            height={150}
            priority
            className="absolute top-1/2 left-1/2 size-[150px] max-w-none -translate-x-1/2 -translate-y-1/2"
          />
        </span>
        <span className="leading-tight">
          <span className="block font-display text-xl font-bold tracking-tight group-hover:text-moss">Meta Ads performance</span>
          <span className="block text-xs text-muted">Bangladesh</span>
        </span>
      </Link>
      <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
        <span aria-hidden="true" className="breathe size-2 rounded-full bg-moss" />
        Live data
      </span>
    </header>
  );
}
