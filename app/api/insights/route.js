import { respond } from "@/lib/api";
import { getInsights } from "@/lib/dashboard";

export function GET(request) {
  return respond(request, getInsights);
}
