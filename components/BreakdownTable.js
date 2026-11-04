import { formatMoney, formatNumber, formatPercent, formatRatio } from "@/lib/format";

const COLUMNS = [
  ["Impressions", (row) => formatNumber(row.impressions)],
  ["Reach", (row) => (row.reach === null ? "–" : formatNumber(row.reach))],
  ["Frequency", (row) => (row.frequency === null ? "–" : formatRatio(row.frequency))],
  ["CPM", (row, currency) => formatMoney(row.cpm, currency)],
  ["Clicks", (row) => formatNumber(row.clicks)],
  ["CTR", (row) => formatPercent(row.ctr)],
  ["Engagements", (row) => formatNumber(row.engagements)],
  ["Eng. rate", (row) => formatPercent(row.engagementRate)],
];

const cell = "whitespace-nowrap py-2.5 pl-5 text-right";

const DEFAULT_NOTE = "The total shows Unique Reach, which is lower than adding up each row's reach.";

export default function BreakdownTable({ rows, labelKey, labelHeading, caption, summary, currency, note = DEFAULT_NOTE }) {
  const totalSpend = rows.reduce((sum, row) => sum + row.spend, 0);

  return (
    <>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th scope="col" className="py-2 pr-4 text-left font-medium">{labelHeading}</th>
              <th scope="col" className="w-56 py-2 text-left font-medium">Spend</th>
              {COLUMNS.map(([label]) => (
                <th key={label} scope="col" className="whitespace-nowrap py-2 pl-5 text-right font-medium">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const share = totalSpend ? (row.spend / totalSpend) * 100 : 0;
              return (
                <tr key={row[labelKey]} className="border-b border-line">
                  <th scope="row" className="whitespace-nowrap py-2.5 pr-4 text-left font-medium">{row[labelKey]}</th>
                  <td className="py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-28 shrink-0 whitespace-nowrap">
                        {formatMoney(row.spend, currency)} <span className="text-xs text-muted">{share.toFixed(1)}%</span>
                      </span>
                      <span aria-hidden="true" className="h-2 grow overflow-hidden rounded-sm bg-moss-soft">
                        <span className="block h-full rounded-sm bg-moss" style={{ width: `${share}%` }} />
                      </span>
                    </div>
                  </td>
                  {COLUMNS.map(([label, value]) => (
                    <td key={label} className={cell}>{value(row, currency)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <th scope="row" className="py-2.5 pr-4 text-left">Total</th>
              <td className="py-2.5">{formatMoney(summary.spend, currency)}</td>
              {COLUMNS.map(([label, value]) => (
                <td key={label} className={cell}>{value(summary, currency)}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">{note}</p>
    </>
  );
}
