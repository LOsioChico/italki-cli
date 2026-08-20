import type { SearchResult, TeacherResult } from "../transforms/search";
import type { SearchFilters } from "../schemas/search";
import { bold, dim, green, yellow, cyan } from "../lib/color";

function formatPrice(dollars: number | null): string {
  return dollars != null ? `$${dollars.toFixed(2)}` : "?";
}

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

function formatTeacherLine(t: TeacherResult): string {
  const id = t.id;
  const name = t.name;
  const pro = t.type === "pro" ? cyan("PRO") : dim("TUTOR");
  const price = green(formatPrice(t.priceFrom));
  const country = t.country;
  const rating = t.rating;
  const sessions = t.sessionCount;
  const hasTrial = t.hasTrial;
  const trialPrice = t.trialPrice;

  const ratingStr = rating != null ? ` ${yellow(`★${rating}`)}` : dim(" new");
  const sessionsStr = sessions ? dim(` ${sessions} sessions`) : "";
  const trialStr = hasTrial
    ? cyan(` trial${trialPrice != null ? ` ${formatPrice(trialPrice)}` : ""}`)
    : "";
  return `  ${dim(`#${id}`)}  ${bold(name)} [${pro}] ${dim(`from ${country} — from`)} ${price}${ratingStr}${sessionsStr}${trialStr}`;
}

export function formatSearch(result: SearchResult, filters: SearchFilters, limit?: number): string[] {
  const total = result.paging.total;
  const teachers = limit && limit > 0 ? result.teachers.slice(0, limit) : result.teachers;

  // Echo active filters in user-facing terms
  const activeFilters: Array<[boolean, string]> = [
    [!!filters.teacherType, `type=${filters.teacherType}`],
    [!!filters.originCountry, `country=${filters.originCountry?.join(",")}`],
    [!!filters.speaks, `speaks=${filters.speaks?.join(",")}`],
    [!!filters.maxPrice, `max=$${(filters.maxPrice! / 100).toFixed(2)}`],
    [!!filters.minPrice, `min=$${(filters.minPrice! / 100).toFixed(2)}`],
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

  const teacherLines = teachers.map(formatTeacherLine);

  const pagination = result.paging.hasNext
    ? ["", dim(`  Next page: italki search ${filters.language}${filterFlags(filters) ? ` ${filterFlags(filters)}` : ""} --page ${result.paging.page + 1}`)]
    : [];

  const hint = teachers.length > 0
    ? [dim(`  View profile: italki teacher <id>`)]
    : [];

  return [header, "", ...teacherLines, ...pagination, ...hint];
}
