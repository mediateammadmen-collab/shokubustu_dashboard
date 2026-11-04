import BreakdownTable from "./BreakdownTable";

function Report({ id, title, description, rows, labelKey, insights, note }) {
  if (!rows?.length) return null;
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="font-display text-2xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <BreakdownTable
        rows={rows}
        labelKey={labelKey}
        labelHeading={title.replace(" performance", "")}
        caption={title}
        summary={insights.summary}
        currency={insights.currency}
        note={note}
      />
    </section>
  );
}

export default function DeviceReports({ insights }) {
  return (
    <>
      <Report
        id="platform-report"
        title="Platform performance"
        description="Which Meta app ads appeared on, highest spend first."
        rows={insights.platforms}
        labelKey="platform"
        insights={insights}
      />
      <Report
        id="device-report"
        title="Device performance"
        description="The device people saw ads on, highest spend first."
        rows={insights.devices}
        labelKey="device"
        insights={insights}
      />
      <Report
        id="os-report"
        title="Operating system performance"
        description="Worked out from the device, because Meta doesn't report operating system directly. Desktop can't be split into Windows or Mac."
        rows={insights.operatingSystems}
        labelKey="os"
        insights={insights}
        note="Reach and frequency aren't shown by operating system, because adding reach across devices can count people twice. The total shows Unique Reach."
      />
    </>
  );
}
