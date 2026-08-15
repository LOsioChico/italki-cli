import type { SearchResponse, SearchFilters } from "../schemas/search";
import { formatPrice } from "../constants";
import { bold, dim, green, yellow, cyan } from "../lib/color";

function filterFlags(filters: SearchFilters): string {
  const parts: string[] = [];
  if (filters.teacherType) parts.push(`--type ${filters.teacherType}`);
  if (filters.originCountry) parts.push(`--country ${filters.originCountry.join(",")}`);
  if (filters.speaks) parts.push(`--speaks ${filters.speaks.join(",")}`);
  if (filters.maxPrice) parts.push(`--max-price ${filters.maxPrice / 100}`);
  if (filters.minPrice) parts.push(`--min-price ${filters.minPrice / 100}`);
  if (filters.isNative) parts.push("--native");
  if (filters.category) parts.push(`--category ${filters.category.join(",")}`);
  if (filters.tags) parts.push(`--tags ${filters.tags.join(",")}`);
  if (filters.hasTrial) parts.push("--has-trial");
  if (filters.instant) parts.push("--instant");
  if (filters.recording) parts.push("--recording");
  if (filters.available72h) parts.push("--available-72h");
  if (filters.weekday) parts.push(`--weekday ${filters.weekday.join(",")}`);
  return parts.join(" ");
}

export function formatSearch(result: SearchResponse, filters: SearchFilters, limit?: number): string[] {
  const total = result.paging?.total ?? 0;
  const teachers = limit && limit > 0 ? (result.data ?? []).slice(0, limit) : (result.data ?? []);

  // Echo active filters in user-facing terms
  const activeFilters: Array<[boolean, string]> = [
    [!!filters.teacherType, `type=${filters.teacherType}`],
    [!!filters.originCountry, `country=${filters.originCountry?.join(",")}`],
    [!!filters.speaks, `speaks=${filters.speaks?.join(",")}`],
    [!!filters.maxPrice, `max=${formatPrice(filters.maxPrice)}`],
    [!!filters.minPrice, `min=${formatPrice(filters.minPrice)}`],
    [!!filters.isNative, "native"],
    [!!filters.category, `category=${filters.category?.join(",")}`],
    [!!filters.tags, `tags=${filters.tags?.join(",")}`],
    [!!filters.hasTrial, "trial"],
    [!!filters.instant, "instant"],
    [!!filters.recording, "recording"],
    [!!filters.available72h, "72h"],
    [!!filters.weekday, `days=${filters.weekday?.join(",")}`],
  ];

  const filterStr = activeFilters
    .filter(([active]) => active)
    .map(([, label]) => label)
    .join(", ");

  const header = bold(`Found ${total} ${filters.language} teachers`) + (filterStr ? dim(` (${filterStr})`) : "");

  const teacherLines = teachers.map((t) => {
    const id = t.user_info?.user_id ?? "?";
    const name = t.user_info?.nickname ?? "?";
    const pro = t.user_info?.is_pro ? cyan("PRO") : dim("TUTOR");
    const price = green(formatPrice(t.course_info?.min_price));
    const country = t.user_info?.origin_country_id ?? "?";
    const rating = t.teacher_info?.overall_rating;
    const sessions = t.teacher_info?.session_count;
    const hasTrial = t.course_info?.has_trial;

    const ratingStr = rating && Number(rating) > 0 ? ` ${yellow(`★${rating}`)}` : dim(" new");
    const sessionsStr = sessions ? dim(` ${sessions} sessions`) : "";
    const trialPrice = t.course_info?.trial_price;
    const trialStr = hasTrial
      ? cyan(` trial${trialPrice != null ? ` ${formatPrice(trialPrice)}` : ""}`)
      : "";
    return `  ${dim(`#${id}`)}  ${bold(name)} [${pro}] ${dim(`from ${country} — from`)} ${price}${ratingStr}${sessionsStr}${trialStr}`;
  });

  const pagination = result.paging?.has_next
    ? ["", dim(`  Next page: italki search ${filters.language}${filterFlags(filters) ? ` ${filterFlags(filters)}` : ""} --page ${result.paging.page + 1}`)]
    : [];

  const hint = teachers.length > 0
    ? [dim(`  View profile: italki teacher <id>`)]
    : [];

  return [header, "", ...teacherLines, ...pagination, ...hint];
}
