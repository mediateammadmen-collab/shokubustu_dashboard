"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAG } from "@/lib/meta";

export async function refreshData() {
  updateTag(CACHE_TAG);
  revalidatePath("/");
}
