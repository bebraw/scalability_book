type FeedbackModeration = {
  resolvedAt?: string | null;
  hiddenAt?: string | null;
  featuredAt?: string | null;
};

export function feedbackStatus(comment: FeedbackModeration) {
  if (comment.hiddenAt) return "hidden";
  if (comment.resolvedAt) return "resolved";
  return "open";
}

export function matchesFeedbackStatus(
  comment: FeedbackModeration,
  status: string,
): boolean {
  if (status === "open") return feedbackStatus(comment) === "open";
  if (status === "resolved") return Boolean(comment.resolvedAt);
  if (status === "hidden") return Boolean(comment.hiddenAt);
  if (status === "featured") return Boolean(comment.featuredAt);
  return true;
}
