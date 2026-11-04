import BreakdownTable from "./BreakdownTable";

export default function PlacementReport({ data, summary, currency }) {
  if (!data.length) return null;

  return (
    <section aria-labelledby="placement-report" className="mt-10">
      <h2 id="placement-report" className="font-display text-2xl font-bold">Placement performance</h2>
      <p className="mt-1 text-sm text-muted">Where ads appeared on each platform, highest spend first.</p>
      <BreakdownTable rows={data} labelKey="placement" labelHeading="Placement" caption="Performance by placement" summary={summary} currency={currency} />
    </section>
  );
}
