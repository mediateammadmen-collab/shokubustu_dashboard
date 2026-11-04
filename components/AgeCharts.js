"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney, formatNumber } from "@/lib/format";

const HEIGHT = 240;
const RADIAN = Math.PI / 180;
const MIN_LABEL_SHARE = 0.05;

// Colour follows the age group, so each group looks the same in every pie and date range.
const AGE_ORDER = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+", "Unknown"];
const ageColor = (age) => `var(--age-${AGE_ORDER.indexOf(age) + 1 || AGE_ORDER.length})`;

// Left out of this section on request. The summary and other sections still include them.
const HIDDEN_AGES = new Set(["35-44", "45-54", "55-64", "65+"]);

const percent = (share) => `${(share * 100).toFixed(1)}%`;

function SliceLabel({ cx, cy, midAngle, outerRadius, percent: share }) {
  if (share < MIN_LABEL_SHARE) return null;
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="var(--ink)" fontSize={13} fontWeight={500} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
      {percent(share)}
    </text>
  );
}

function SliceTooltip({ active, payload, metric, formatValue, total }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm shadow-md">
      <div className="text-xs text-muted">Age {name}</div>
      <div className="mt-0.5">
        {metric} <strong className="ml-1 font-semibold">{formatValue(value)}</strong>
        <span className="ml-1 text-muted">({percent(value / total)})</span>
      </div>
    </div>
  );
}

function AgePie({ title, metric, dataKey, data, formatValue }) {
  const total = data.reduce((sum, row) => sum + row[dataKey], 0);
  return (
    <div>
      <h3 className="text-center text-base font-semibold">{title}</h3>
      <div className="mt-2" aria-hidden="true" style={{ height: HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: HEIGHT }}>
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey="age"
              startAngle={90}
              endAngle={-270}
              outerRadius={82}
              stroke="var(--paper)"
              strokeWidth={2}
              label={SliceLabel}
              labelLine={false}
              isAnimationActive={false}
            >
              {data.map((row) => (
                <Cell key={row.age} fill={ageColor(row.age)} />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip metric={metric} formatValue={formatValue} total={total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AgeCharts({ data, currency }) {
  const money = (value) => formatMoney(value, currency);
  const rows = data.filter((row) => !HIDDEN_AGES.has(row.age) && (row.spend > 0 || row.impressions > 0 || row.reach > 0));
  if (!rows.length) return null;
  const hiddenSpend = data.filter((row) => HIDDEN_AGES.has(row.age)).reduce((sum, row) => sum + row.spend, 0);

  const totals = rows.reduce(
    (sum, row) => ({ spend: sum.spend + row.spend, impressions: sum.impressions + row.impressions, reach: sum.reach + row.reach }),
    { spend: 0, impressions: 0, reach: 0 },
  );
  const share = (row, key) => percent(totals[key] ? row[key] / totals[key] : 0);

  return (
    <section aria-labelledby="age-breakdown" className="mt-10">
      <h2 id="age-breakdown" className="font-display text-2xl font-bold">Age breakdown</h2>
      <p className="mt-1 text-sm text-muted">
        Ages under 35 only, so shares add up to 100% of the ages shown.
        {hiddenSpend > 0 ? ` Ages 35 and over are hidden, which leaves out ${money(hiddenSpend)} of spend.` : ""} Meta reports reach separately for each age.
      </p>

      <ul aria-hidden="true" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.age} className="flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ background: ageColor(row.age) }} />
            {row.age}
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-6 md:grid-cols-3">
        <AgePie title="Spend" metric="Spend" dataKey="spend" data={rows} formatValue={money} />
        <AgePie title="Impressions" metric="Impressions" dataKey="impressions" data={rows} formatValue={formatNumber} />
        <AgePie title="Reach" metric="Reach" dataKey="reach" data={rows} formatValue={formatNumber} />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <caption className="sr-only">Spend, impressions and reach by age group</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="py-2 pr-4 font-medium">Age</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Spend</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Impressions</th>
              <th scope="col" className="py-2 text-right font-medium">Reach</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.age} className="border-b border-line">
                <th scope="row" className="py-2 pr-4 text-left font-medium">
                  <span aria-hidden="true" className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: ageColor(row.age) }} />
                  {row.age}
                </th>
                <td className="py-2 pr-4 text-right">{money(row.spend)} <span className="text-muted">· {share(row, "spend")}</span></td>
                <td className="py-2 pr-4 text-right">{formatNumber(row.impressions)} <span className="text-muted">· {share(row, "impressions")}</span></td>
                <td className="py-2 text-right">{formatNumber(row.reach)} <span className="text-muted">· {share(row, "reach")}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
