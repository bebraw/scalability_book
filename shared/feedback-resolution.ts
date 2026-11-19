export const feedbackResolutionReasons = [
  "fixed",
  "answered",
  "duplicate",
  "not-actionable",
  "planned",
] as const;

export type FeedbackResolutionReason =
  (typeof feedbackResolutionReasons)[number];
export type FeedbackResolution = {
  resolvedAt: string;
  resolvedBy: string;
  resolutionReason: FeedbackResolutionReason;
};

export function isFeedbackResolutionReason(
  value: unknown,
): value is FeedbackResolutionReason {
  return feedbackResolutionReasons.some((reason) => reason === value);
}

export const feedbackResolutionPrefix = "feedback-resolution:";

export function feedbackResolutionKey(chapter: string, id: string) {
  return `${feedbackResolutionPrefix}${chapter}:${id}`;
}

export function feedbackResolutionMetadata(
  value: unknown,
): FeedbackResolution | null {
  if (!value || typeof value !== "object") return null;
  const { resolvedAt, resolvedBy, resolutionReason } =
    value as Partial<FeedbackResolution>;
  if (
    typeof resolvedAt !== "string" ||
    !Number.isFinite(Date.parse(resolvedAt)) ||
    typeof resolvedBy !== "string" ||
    !isFeedbackResolutionReason(resolutionReason)
  )
    return null;
  return { resolvedAt, resolvedBy, resolutionReason };
}

export function applyFeedbackResolutions<
  T extends { id: string; resolvedAt?: string | null },
>(
  comments: T[],
  chapter: string,
  resolutions: ReadonlyMap<string, FeedbackResolution>,
): T[] {
  return comments.map((comment) => {
    const resolution = resolutions.get(
      feedbackResolutionKey(chapter, comment.id),
    );
    if (
      resolution &&
      (!comment.resolvedAt ||
        Date.parse(resolution.resolvedAt) >= Date.parse(comment.resolvedAt))
    ) {
      return { ...comment, ...resolution };
    }
    return comment;
  });
}
