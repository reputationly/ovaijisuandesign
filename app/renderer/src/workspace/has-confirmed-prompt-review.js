// has-confirmed-prompt-review.js

export function takeLatestPromptReviews(reviews) {
  return reviews.slice(-3);
}

export function hasConfirmedPromptReview(stage) {
  return (
    stage.status === "done" ||
    stage.status === "doing" ||
    (stage.status === "waiting_user" &&
      stage.waiting_reason === "result_review")
  );
}
