import BreakdownTable from "./BreakdownTable";

export default function LocationReport({ data, summary, currency }) {
  if (!data.length) return null;

  return (
    <section aria-labelledby="location-report" className="mt-10">
      <h2 id="location-report" className="font-display text-2xl font-bold">Location performance</h2>
      <p className="mt-1 text-sm text-muted">
        Where ads were delivered, highest spend first. Regions outside Bangladesh appear when ads reached people there.
      </p>
      <BreakdownTable rows={data} labelKey="location" labelHeading="Location" caption="Performance by location" summary={summary} currency={currency} />
    </section>
  );
}
