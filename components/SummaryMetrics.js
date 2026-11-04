import { formatMoney, formatNumber, formatPercent, formatRatio, formatSmallCost } from "@/lib/format";

function Headline({ label, value, delay }) {
  return (
    <div className="rise border-b border-line px-5 py-6 lg:border-b-0 lg:border-l" style={{ animationDelay: `${delay}ms` }}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-3 font-display text-3xl font-bold tracking-tight xl:text-[2.6rem] xl:leading-none">{value}</dd>
    </div>
  );
}

export default function SummaryMetrics({ summary, currency }) {
  const secondary = [
    ["Frequency", formatRatio(summary.frequency)],
    ["Engagement rate", formatPercent(summary.engagementRate)],
    ["Post interactions", formatNumber(summary.interactions)],
    ["Interaction rate", formatPercent(summary.interactionRate)],
    ["Link clicks", formatNumber(summary.linkClicks)],
    ["CTR", formatPercent(summary.ctr)],
    ["CPM", formatMoney(summary.cpm, currency)],
    ...(summary.results?.length ? summary.results : [{ label: null, value: 0, cost: null }]).flatMap(({ label, value, cost }) => [
      [label ? `Results · ${label}` : "Results", formatNumber(value)],
      [
        label === "Reach" ? "Cost per result · per 1,000 reached" : label ? `Cost per result · ${label}` : "Cost per result",
        cost ? formatSmallCost(cost, currency) : "–",
      ],
    ]),
    ...[
      ["Page likes", summary.pageLikes],
      ["Post reactions", summary.postReactions],
      ["Comments", summary.comments],
      ["Profile visits", summary.profileVisits],
    ]
      .filter(([, value]) => value > 0)
      .map(([label, value]) => [label, formatNumber(value)]),
  ];

  return (
    <section aria-label="Summary metrics">
      <dl className="mt-6 grid overflow-hidden rounded-lg border border-line bg-panel sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1fr]">
        <div className="rise bg-moss px-5 py-6 text-moss-ink">
          <dt className="text-sm opacity-85">Spend</dt>
          <dd className="mt-3 font-display text-4xl font-bold tracking-tight xl:text-5xl xl:leading-none">{formatMoney(summary.spend, currency)}</dd>
        </div>
        <Headline label="Unique Reach" value={formatNumber(summary.reach)} delay={60} />
        <Headline label="Impressions" value={formatNumber(summary.impressions)} delay={120} />
        <Headline label="Engagements" value={formatNumber(summary.engagements)} delay={180} />
      </dl>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
        {secondary.map(([label, value]) => (
          <div key={label} className="border-l-2 border-moss-soft pl-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
