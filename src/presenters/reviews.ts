import type { ReviewsResponse, Review } from "../schemas/reviews";
import { bold, dim, yellow } from "../lib/color";
import { wrapText } from "../lib/wrap";
import { timeAgo } from "../lib/time-ago";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatReview(review: Review): string[] {
  const u = review.user_info;
  const c = review.comment_info;
  const country = u.origin_country_id ?? "?";
  const lessons = review.lesson_count > 0 ? ` (${review.lesson_count} lessons)` : "";
  const date = formatDate(c.create_time);
  const ago = timeAgo(c.create_time);
  const content = c.content || "(no text)";

  const pick = c.is_reviews_up ? yellow("★ Teacher's pick  ") : "";
  return [
    `  ${pick}${bold(u.nickname)} ${dim(`from ${country}${lessons}  —  ${date} · ${ago}`)}`,
    ...wrapText(content, "    "),
  ];
}

export function formatReviews(response: ReviewsResponse, id: number, pageSize: number, language?: string): string[] {
  const total = response.paging?.total ?? 0;
  const page = response.paging?.page ?? 1;
  const topTotal = response.data?.top_total ?? 0;
  const reviews = response.data?.review_list ?? [];

  const langLabel = language ? ` in ${language}` : "";
  const pickLabel = topTotal > 0 ? dim(` · ${topTotal} teacher's pick${topTotal > 1 ? "s" : ""}`) : "";
  const header = bold(`  ${total} reviews${langLabel}`) + dim(` (page ${page})`) + pickLabel;

  if (reviews.length === 0) {
    return [header, "", dim("  No reviews on this page.")];
  }

  const reviewLines = reviews.flatMap((r) => [...formatReview(r), ""]);
  reviewLines.pop();

  const langFlag = language ? ` --language ${language}` : "";
  const pagination = response.paging?.has_next
    ? ["", dim(`  Next page: italki reviews ${id} --page ${page + 1}${pageSize !== 10 ? ` --page-size ${pageSize}` : ""}${langFlag}`)]
    : [];

  return [header, "", ...reviewLines, ...pagination];
}
