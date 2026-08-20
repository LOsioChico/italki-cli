import type { ReviewsResult, ReviewResult } from "../transforms/reviews";
import { bold, dim, yellow } from "../lib/color";
import { wrapText } from "../lib/wrap";
import { timeAgo } from "../lib/time-ago";

function formatDate(iso: string, timezone?: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatReview(review: ReviewResult, timezone?: string): string[] {
  const country = review.country;
  const lessons = review.lessonCount > 0 ? ` (${review.lessonCount} lessons)` : "";
  const date = formatDate(review.createdAt, timezone);
  const ago = timeAgo(review.createdAt, timezone);
  const content = review.content || "(no text)";

  const pick = review.isTeachersPick ? yellow("★ Teacher's pick  ") : "";
  return [
    `  ${pick}${bold(review.nickname)} ${dim(`from ${country}${lessons}  —  ${date} · ${ago}`)}`,
    ...wrapText(content, "    "),
  ];
}

export function formatReviews(result: ReviewsResult, id: number, pageSize: number, language?: string, timezone?: string): string[] {
  const total = result.total;
  const page = result.page;
  const topTotal = result.topPicks;
  const reviews = result.reviews;

  const langLabel = language ? ` in ${language}` : "";
  const pickLabel = topTotal > 0 ? dim(` · ${topTotal} teacher's pick${topTotal > 1 ? "s" : ""}`) : "";
  const header = bold(`  ${total} reviews${langLabel}`) + dim(` (page ${page})`) + pickLabel;

  if (reviews.length === 0) {
    return [header, "", dim("  No reviews on this page.")];
  }

  const reviewLines = reviews.flatMap((r) => [...formatReview(r, timezone), ""]);
  reviewLines.pop();

  const langFlag = language ? ` --language ${language}` : "";
  const pagination = result.hasNext
    ? [dim(`  Next page: italki reviews ${id} --page ${page + 1}${pageSize !== 10 ? ` --page-size ${pageSize}` : ""}${langFlag}`)]
    : [];

  return [header, "", ...reviewLines, "", ...pagination];
}
