"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/format";

function ChartTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null;
  const { country, spend } = payload[0].payload;
  return (
    <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm shadow-md">
      <span className="text-muted">{country}</span> <strong className="ml-2 font-semibold">{formatMoney(spend, currency)}</strong>
    </div>
  );
}

export default function SpendChart({ data, currency }) {
  const height = data.length * 44 + 8;
  const total = data.reduce((sum, row) => sum + row.spend, 0);

  return (
    <section aria-labelledby="spend-by-country" className="mt-10">
      <h2 id="spend-by-country" className="font-display text-2xl font-bold">Spend by country</h2>
      <p className="mt-1 text-sm text-muted">Assigned by campaign name, not delivery country.</p>
      <div className="mt-4" aria-hidden="true" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 800, height }}>
          <BarChart layout="vertical" data={data} margin={{ top: 0, right: 84, bottom: 0, left: 0 }} barCategoryGap={12}>
            <XAxis type="number" hide domain={[0, Math.max(total, 1)]} />
            <YAxis
              type="category"
              dataKey="country"
              width={92}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--ink)", fontSize: 14 }}
            />
            <Tooltip cursor={{ fill: "var(--shade)" }} content={<ChartTooltip currency={currency} />} />
            <Bar dataKey="spend" fill="var(--moss)" radius={[0, 4, 4, 0]} barSize={20} minPointSize={2} isAnimationActive={false}>
              <LabelList
                dataKey="spend"
                position="right"
                formatter={(value) => formatMoney(value, currency)}
                style={{ fill: "var(--ink)", fontSize: 14, fontWeight: 500 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Spend by country</caption>
        <tbody>
          {data.map((row) => (
            <tr key={row.country}>
              <th scope="row">{row.country}</th>
              <td>{formatMoney(row.spend, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
