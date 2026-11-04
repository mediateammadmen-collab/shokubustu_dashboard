"use client";

/* eslint-disable @next/next/no-img-element -- Meta CDN images are served as-is rather than through the image optimizer. */

import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { Clapperboard, ImageOff, X } from "lucide-react";
import { useState } from "react";
import { formatCostPerResult, formatDay, formatDuration, formatMoney, formatNumber, formatPercent, formatRatio } from "@/lib/format";

function statusLabel(status) {
  if (!status) return "Unknown";
  const text = status.replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function StatusBadge({ status }) {
  const active = status === "ACTIVE";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${active ? "bg-moss text-moss-ink" : "bg-panel text-ink ring-1 ring-line"}`}>
      {statusLabel(status)}
    </span>
  );
}

function FormatBadge({ label }) {
  return label ? <span className="rounded bg-panel px-2 py-0.5 text-xs font-medium text-ink ring-1 ring-line">{label}</span> : null;
}

function AdImage({ src, alt, className }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!src || failedSrc === src) {
    return (
      <div className={`grid place-items-center bg-moss-soft text-muted ${className}`}>
        <ImageOff className="size-7" aria-hidden="true" />
        <span className="sr-only">Image unavailable</span>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} className={`bg-moss-soft object-contain ${className}`} />;
}

function AdMedia({ ad, className, large = false }) {
  if (ad.isVideo && ad.videoSource) {
    return (
      <video
        controls
        playsInline
        preload={large ? "metadata" : "none"}
        poster={ad.poster ?? undefined}
        src={ad.videoSource}
        aria-label={`Video: ${ad.title}`}
        className={`relative z-10 bg-black object-contain ${className}`}
      />
    );
  }
  return <AdImage src={ad.poster ?? ad.image} alt={ad.title} className={className} />;
}

function cardMetrics(ad, currency) {
  const { metrics, result } = ad;
  return [
    ["Impressions", formatNumber(metrics.impressions)],
    ["Spend", formatMoney(metrics.spend, currency)],
    ["Clicks", formatNumber(metrics.clicks)],
    ["CTR", formatPercent(metrics.ctr)],
    ad.campaignType === "Reach" ? ["Frequency", formatRatio(metrics.frequency)] : ["CPC", formatMoney(metrics.cpc, currency)],
    [result.label, formatNumber(result.value)],
    ...(ad.isVideo ? [["3s Views", formatNumber(metrics.videoViews)]] : []),
  ];
}

function videoStats(ad, currency) {
  const { video } = ad;
  return [
    ["Video plays", formatNumber(video.plays)],
    ["ThruPlays", formatNumber(video.thruplays)],
    ["Cost per ThruPlay", video.thruplays ? formatCostPerResult(video.costPerThruplay, currency) : "–"],
    ["Avg. play time", formatDuration(video.avgWatchSeconds)],
    ["Played to 25%", formatNumber(video.p25)],
    ["Played to 50%", formatNumber(video.p50)],
    ["Played to 75%", formatNumber(video.p75)],
    ["Played to 95%", formatNumber(video.p95)],
    ["Played to 100%", formatNumber(video.p100)],
  ];
}

function VideoStats({ ad, currency, className = "" }) {
  if (!ad.video) return null;
  return (
    <div className="mt-3 border-t border-line pt-3">
      <h4 className="text-xs font-semibold">Video</h4>
      <dl className={`mt-2 grid grid-cols-2 gap-x-4 gap-y-2 ${className}`}>
        {videoStats(ad, currency).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function dateSpan(ad) {
  if (!ad.adsetStart) return "Dates unavailable";
  return `${formatDay(ad.adsetStart)} – ${ad.adsetEnd ? formatDay(ad.adsetEnd) : "ongoing"}`;
}

function AdCard({ ad, currency, onOpen }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-panel transition-colors hover:border-moss">
      <div className="relative">
        <AdMedia ad={ad} className="aspect-[3/4] w-full" />
        <div className="pointer-events-none absolute top-2 left-2 z-20 flex flex-wrap gap-1.5">
          <StatusBadge status={ad.status} />
          <FormatBadge label={ad.format} />
          {ad.isVideo && !ad.videoSource ? (
            <span className="inline-flex items-center gap-1 rounded bg-panel px-2 py-0.5 text-xs text-ink ring-1 ring-line">
              <Clapperboard className="size-3" aria-hidden="true" />
              Poster only
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex grow flex-col p-4">
        <h3 className="line-clamp-2 text-[0.95rem] leading-snug font-semibold">
          <button type="button" onClick={onOpen} className="text-left after:absolute after:inset-0 after:content-[''] group-hover:text-moss">
            {ad.title}
          </button>
        </h3>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3">
          {cardMetrics(ad, currency).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <VideoStats ad={ad} currency={currency} />
        <p className="mt-auto pt-3 text-xs text-muted">
          {[ad.countries, ad.objective].filter(Boolean).join(" · ")}
          <br />
          {dateSpan(ad)}
        </p>
      </div>
    </article>
  );
}

function AdDialog({ ad, currency, onClose }) {
  const metrics = ad
    ? [
        ...cardMetrics(ad, currency),
        ["Reach", formatNumber(ad.metrics.reach)],
        ["CPM", formatMoney(ad.metrics.cpm, currency)],
        ["CPC", formatMoney(ad.metrics.cpc, currency)],
        ["Frequency", formatRatio(ad.metrics.frequency)],
        ["Engagements", formatNumber(ad.metrics.engagements)],
        ["Engagement rate", formatPercent(ad.metrics.engagementRate)],
        ["Cost per engagement", formatCostPerResult(ad.metrics.costPerEngagement, currency)],
        ["Post interactions", formatNumber(ad.metrics.interactions)],
        ["Interaction rate", formatPercent(ad.metrics.interactionRate)],
        ["Link clicks", formatNumber(ad.metrics.linkClicks)],
      ].filter(([label], index, all) => all.findIndex(([other]) => other === label) === index)
    : [];

  return (
    <Dialog.Root open={Boolean(ad)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-panel shadow-2xl"
        >
          {ad ? (
            <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
              <div className="bg-moss-soft">
                <AdMedia ad={ad} large className="aspect-[3/4] w-full" />
                {ad.isVideo && !ad.videoSource ? (
                  <p className="p-3 text-xs text-muted">Meta didn&apos;t return a playable file for this video, so its poster is shown.</p>
                ) : null}
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-1.5 pr-10">
                  <StatusBadge status={ad.status} />
                  <FormatBadge label={ad.format} />
                </div>
                <Dialog.Title className="mt-3 font-display text-2xl leading-tight font-bold">{ad.title}</Dialog.Title>
                <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-line pt-4 sm:grid-cols-3">
                  {metrics.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="text-sm font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
                <VideoStats ad={ad} currency={currency} className="sm:grid-cols-3" />
                <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
                  <div><dt className="inline text-muted">Campaign: </dt><dd className="inline break-words">{ad.campaignName}</dd></div>
                  <div><dt className="inline text-muted">Ad name: </dt><dd className="inline break-words">{ad.name}</dd></div>
                  <div><dt className="inline text-muted">Countries: </dt><dd className="inline">{ad.countries || "Unknown"}</dd></div>
                  <div><dt className="inline text-muted">Objective: </dt><dd className="inline">{ad.objective || "Unknown"}</dd></div>
                  <div><dt className="inline text-muted">Ad set dates: </dt><dd className="inline">{dateSpan(ad)}</dd></div>
                </dl>
              </div>
            </div>
          ) : null}
          <Dialog.Close aria-label="Close" className="absolute top-3 right-3 z-20 grid size-9 place-items-center rounded-md bg-panel text-ink ring-1 ring-line hover:ring-moss">
            <X className="size-4" aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function CreativesSection({ data, market }) {
  const [tab, setTab] = useState("all");
  const [openId, setOpenId] = useState(null);
  const adsById = new Map(data.ads.map((ad) => [ad.id, ad]));
  const active = data.groups.some((group) => group.key === tab) ? tab : "all";

  return (
    <section aria-labelledby="ad-creatives" className="mt-12">
      <h2 id="ad-creatives" className="font-display text-2xl font-bold">Ad creatives</h2>

      {data.detailsMissing > 0 ? (
        <p role="status" className="mt-3 border-l-2 border-seal pl-3 text-sm text-muted">
          Meta is limiting requests right now, so images and details are missing for {data.detailsMissing} of {data.ads.length} ads. Their numbers are still correct. Try again in a few minutes.
        </p>
      ) : null}

      {data.ads.length === 0 ? (
        <p className="mt-4 max-w-2xl border-t border-line pt-4 text-muted">
          {market
            ? `No ads delivered in this period for ${market.label}. Campaigns count toward it when their name contains “${market.keyword}”.`
            : "No ads delivered in this period."}
        </p>
      ) : (
        <Tabs.Root value={active} onValueChange={setTab} className="mt-4">
          <Tabs.List aria-label="Ad groups" className="flex gap-5 overflow-x-auto border-b border-line">
            {data.groups.map((group) => (
              <Tabs.Trigger
                key={group.key}
                value={group.key}
                className="-mb-px shrink-0 cursor-pointer border-b-2 border-transparent py-2.5 text-sm font-medium text-muted hover:text-ink data-[state=active]:border-moss data-[state=active]:text-ink"
              >
                {group.label} <span className="ml-0.5 text-xs">{group.count}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {data.groups.map((group) => (
            <Tabs.Content key={group.key} value={group.key} className="outline-none">
              <p className="flex flex-wrap gap-x-5 gap-y-1 py-4 text-sm">
                <span><span className="text-muted">Total spend</span> <strong className="font-semibold">{formatMoney(group.spend, data.currency)}</strong></span>
                {group.results.map((result) => (
                  <span key={result.type}><span className="text-muted">{result.label}</span> <strong className="font-semibold">{formatNumber(result.value)}</strong></span>
                ))}
              </p>
              {group.count === 0 ? (
                <p className="text-muted">No Engagement campaign ads with engagements in this period.</p>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.adIds.map((id) => (
                    <AdCard key={id} ad={adsById.get(id)} currency={data.currency} onOpen={() => setOpenId(id)} />
                  ))}
                </div>
              )}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      )}
      <AdDialog ad={openId ? adsById.get(openId) : null} currency={data.currency} onClose={() => setOpenId(null)} />
    </section>
  );
}
