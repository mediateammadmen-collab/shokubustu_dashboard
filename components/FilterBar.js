"use client";

import * as Popover from "@radix-ui/react-popover";
import * as Select from "@radix-ui/react-select";
import { format, parseISO } from "date-fns";
import { CalendarDays, Check, ChevronDown, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { refreshData } from "@/app/actions";
import { CUSTOM_RANGE, RANGES } from "@/lib/config";
import { formatDay } from "@/lib/format";
import { useFilterTransition } from "./FilterShell";

const control =
  "inline-flex h-10 items-center justify-between gap-2 rounded-md border border-line bg-panel px-3 text-sm font-medium hover:border-moss data-[state=open]:border-moss";

function FilterSelect({ label, value, placeholder, options, onChange }) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger aria-label={label} className={`${control} min-w-40`}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown className="size-4 text-muted" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" sideOffset={6} className="z-50 min-w-(--radix-select-trigger-width) rounded-md border border-line bg-panel p-1 shadow-lg">
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative flex h-9 cursor-pointer items-center rounded pr-3 pl-8 text-sm outline-none data-highlighted:bg-moss-soft"
              >
                <Select.ItemIndicator className="absolute left-2">
                  <Check className="size-4 text-moss" aria-hidden="true" />
                </Select.ItemIndicator>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

const rangeOptions = [...RANGES.map(({ value, label }) => ({ value, label })), { value: CUSTOM_RANGE, label: "Custom range…" }];

export default function FilterBar({ filters, dateStart, dateStop, timezone }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pending, startTransition } = useFilterTransition();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selected, setSelected] = useState(
    filters.start && filters.end ? { from: parseISO(filters.start), to: parseISO(filters.end) } : undefined,
  );

  function navigate(changes) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    startTransition(() => router.replace(`/?${next}`, { scroll: false }));
  }

  function changeRange(value) {
    // Wait for the dropdown to close and hand back focus, or the calendar closes straight away.
    if (value === CUSTOM_RANGE) setTimeout(() => setCalendarOpen(true), 50);
    else navigate({ range: value, start: null, end: null });
  }

  function applyCustomRange() {
    setCalendarOpen(false);
    navigate({
      range: CUSTOM_RANGE,
      start: format(selected.from, "yyyy-MM-dd"),
      end: format(selected.to ?? selected.from, "yyyy-MM-dd"),
    });
  }

  const period = dateStart ? `${formatDay(dateStart)} – ${formatDay(dateStop)}` : null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-y border-line py-3">
      <FilterSelect label="Date range" value={filters.range} options={rangeOptions} onChange={changeRange} />

      <Popover.Root open={calendarOpen} onOpenChange={setCalendarOpen}>
        {filters.range === CUSTOM_RANGE ? (
          <Popover.Trigger className={control}>
            <CalendarDays className="size-4 text-muted" aria-hidden="true" />
            {formatDay(filters.start)} – {formatDay(filters.end)}
          </Popover.Trigger>
        ) : (
          <Popover.Anchor />
        )}
        <Popover.Portal>
          <Popover.Content onFocusOutside={(event) => event.preventDefault()} align="start" sideOffset={6} className="z-50 max-w-[calc(100vw-2rem)] overflow-auto rounded-md border border-line bg-panel p-3 shadow-lg">
            <DayPicker mode="range" selected={selected} onSelect={setSelected} disabled={{ after: new Date() }} defaultMonth={selected?.from} />
            <button
              type="button"
              disabled={!selected?.from}
              onClick={applyCustomRange}
              className="mt-2 h-9 w-full rounded-md bg-moss text-sm font-medium text-moss-ink disabled:opacity-40"
            >
              Apply range
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>


      <p className="min-w-0 grow px-1 text-sm text-muted">
        {period}
        {period && timezone ? <span className="hidden md:inline"> · {timezone}</span> : null}
      </p>

      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => refreshData())}
        className={`${control} disabled:opacity-60`}
      >
        <RefreshCw className={`size-4 text-muted ${pending ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
        {pending ? "Updating…" : "Refresh"}
      </button>
    </div>
  );
}
