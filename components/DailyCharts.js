"use client";

import { format, parseISO } from "date-fns";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDay, formatMoney, formatNumber, formatRatio } from "@/lib/format";

const HEIGHT = 240;
const shortDate = (iso) => format(parseISO(iso), "d MMM");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function DayTooltip({ active, payload, label, metric, formatValue }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm shadow-md">
      <div className="text-xs text-muted">{formatDay(label)}</div>
      <div className="mt-0.5">
        {payload[0].value === null ? (
          "No delivery"
        ) : (
          <>
            {metric} <strong className="ml-1 font-semibold">{formatValue(payload[0].value)}</strong>
          </>
        )}
      </div>
    </div>
  );
}

function DailyChart({ id, title, metric, dataKey, data, formatValue = formatNumber, formatTick = (value) => compact.format(value) }) {
  return (
    <div>
      <h3 id={id} className="text-base font-semibold">{title}</h3>
      <div className="mt-3" aria-hidden="true" style={{ height: HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: HEIGHT }}>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              minTickGap={48}
              tickLine={false}
              axisLine={{ stroke: "var(--line)" }}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
            />
            <YAxis
              width={52}
              tickFormatter={formatTick}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
            />
            <Tooltip cursor={{ stroke: "var(--muted)" }} content={<DayTooltip metric={metric} formatValue={formatValue} />} />
            <Area
              type="linear"
              dataKey={dataKey}
              stroke="var(--moss)"
              strokeWidth={2}
              fill="var(--moss)"
              fillOpacity={0.14}
              dot={data.filter((row) => row[dataKey] !== null).length === 1 ? { r: 4, fill: "var(--moss)", fillOpacity: 1, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: "var(--moss)", stroke: "var(--panel)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only" aria-labelledby={id}>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">{metric}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.date}>
              <th scope="row">{formatDay(row.date)}</th>
              <td>{row[dataKey] === null ? "No delivery" : formatValue(row[dataKey])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DailyCharts({ data, currency }) {
  if (!data.some((row) => row.spend > 0 || row.reach > 0 || row.impressions > 0)) return null;

  const money = (value) => formatMoney(value, currency);
  // CPM here is only a few cents, so 2 decimals would round different days to the same value.
  const cpmValue = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: value < 1 ? 3 : 2,
      maximumFractionDigits: value < 1 ? 3 : 2,
    }).format(value);
  const moneyTick = (value) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(value);

  return (
    <section aria-labelledby="daily-delivery" className="mt-10">
      <h2 id="daily-delivery" className="font-display text-2xl font-bold">Daily delivery</h2>
      <p className="mt-1 text-sm text-muted">
        Account level. Daily reach counts people each day, so it adds up to more than Unique Reach, and daily frequency runs lower than the overall figure.
      </p>
      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <DailyChart id="daily-spend" title="Spend by day" metric="Spend" dataKey="spend" data={data} formatValue={money} formatTick={moneyTick} />
        <DailyChart id="daily-cpm" title="CPM by day" metric="CPM" dataKey="cpm" data={data} formatValue={cpmValue} formatTick={cpmValue} />
        <DailyChart id="daily-impressions" title="Impressions by day" metric="Impressions" dataKey="impressions" data={data} />
        <DailyChart id="daily-reach" title="Reach by day" metric="Reach" dataKey="reach" data={data} />
        <div className="lg:col-span-2">
          <DailyChart id="daily-frequency" title="Frequency by day" metric="Frequency" dataKey="frequency" data={data} formatValue={formatRatio} formatTick={formatRatio} />
        </div>
      </div>
    </section>
  );
}
