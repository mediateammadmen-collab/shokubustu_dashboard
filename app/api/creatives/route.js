import { respond } from "@/lib/api";
import { getCreatives } from "@/lib/dashboard";

export function GET(request) {
  return respond(request, getCreatives);
}
