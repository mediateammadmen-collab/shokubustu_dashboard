import { formatDistanceToNow } from "date-fns";
import { Suspense } from "react";
import AgeCharts from "@/components/AgeCharts";
import ApiNotice from "@/components/ApiNotice";
import CreativesSection from "@/components/CreativesSection";
import FilterBar from "@/components/FilterBar";
import { FilterShell, FilterContent } from "@/components/FilterShell";
import LocationReport from "@/components/LocationReport";
import DeviceReports from "@/components/DeviceReports";
import PlacementReport from "@/components/PlacementReport";
import SummaryMetrics from "@/components/SummaryMetrics";
import { getCreatives, getInsights } from "@/lib/dashboard";
import { parseFilters } from "@/lib/filters";
import { MetaApiError, MissingEnvError } from "@/lib/meta";

export default async function Page({ searchParams }) {
  const filters = parseFilters(await searchParams);
  let insights = null;
  let creatives = null;
  let problem = null;

  try {
    [insights, creatives] = await Promise.all([getInsights(filters), getCreatives(filters)]);
  } catch (error) {
    if (error instanceof MissingEnvError) problem = { title: "Setup needed", message: error.message };
    else if (error instanceof MetaApiError && error.isRateLimit) {
      problem = {
        title: "Meta is limiting requests",
        message: "Your token is fine, but Meta has temporarily limited calls and there's no saved data for this date range yet. Try again in a few minutes.",
      };
    } else if (error instanceof MetaApiError) problem = { title: "Meta returned an error", message: error.message };
    else throw error;
  }

  const staleSince = [insights?.staleSince, creatives?.staleSince].filter(Boolean).sort()[0];

  return (
    <FilterShell>
      <Suspense>
        <FilterBar filters={filters} dateStart={insights?.dateStart} dateStop={insights?.dateStop} timezone={insights?.timezone} />
      </Suspense>
      <FilterContent>
        {problem ? (
          <ApiNotice title={problem.title} message={problem.message} />
        ) : (
          <>
            {staleSince ? (
              <p role="status" className="mt-4 border-l-2 border-seal pl-3 text-sm text-muted">
                Meta is limiting requests, so this is saved data from {formatDistanceToNow(new Date(staleSince), { addSuffix: true })}. It updates once the limit clears.
              </p>
            ) : null}
            <SummaryMetrics summary={insights.summary} currency={insights.currency} />
            <AgeCharts data={insights.ageBreakdown ?? []} currency={insights.currency} />
            <LocationReport data={insights.locations ?? []} summary={insights.summary} currency={insights.currency} />
            <PlacementReport data={insights.placements ?? []} summary={insights.summary} currency={insights.currency} />
            <DeviceReports insights={insights} />
            <CreativesSection data={creatives} market={filters.market} />
          </>
        )}
      </FilterContent>
    </FilterShell>
  );
}
