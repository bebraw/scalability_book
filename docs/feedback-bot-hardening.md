# Feedback Bot Hardening

The GitHub login flow is suitable for student identity, but it is not a complete spam defense by itself. Any authenticated GitHub account can currently post feedback. Keep the OAuth flow as the identity layer and add abuse controls around the write endpoints.

## Phase 1: Rate Limit Authenticated Writes

Add per-login and per-IP rate limits for `POST /api/comments` and `POST /api/stuck`.

- Store counters in KV with keys such as `rate:<window>:login:<github-login>` and `rate:<window>:ip:<client-ip>`.
- Use short windows for burst control, for example 10 comments per 10 minutes per login and 30 writes per 10 minutes per IP.
- Return `429 Too Many Requests` with a clear JSON message when a limit is exceeded.
- Keep admin users exempt or give them a higher moderation limit.

Acceptance criteria:

- A normal student can post several comments without friction.
- Repeated scripted POSTs from one login or IP receive `429`.
- Rate limit keys expire automatically and do not require manual cleanup.

## Phase 2: Add Cloudflare Turnstile To Feedback Submission

Use Turnstile as a challenge only when the user submits feedback, not during normal reading.

- Add a Turnstile widget to comment and stuck forms.
- Send the Turnstile token with each feedback POST.
- Verify the token in the Worker before writing to KV.
- Keep the feature configurable with `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` so local development can run without it.

Acceptance criteria:

- Missing or invalid Turnstile tokens cannot create comments.
- Valid GitHub login plus valid Turnstile token can create comments.
- Local development remains usable without production Turnstile secrets.

## Phase 3: Restrict Who Can Post During Course Runs

For stricter course deployments, add an optional allowlist before accepting feedback writes.

- Support a `FEEDBACK_GITHUB_LOGINS` Worker var containing comma-separated GitHub usernames.
- If the var is empty, preserve the current behavior: any GitHub user may post.
- If the var is set, allow only listed users and admins to post comments or stuck markers.
- Document how to update the allowlist before each course run.

Acceptance criteria:

- Unlisted authenticated users can sign in but receive `403` when posting.
- Listed users and admins can post normally.
- Public featured notes remain visible to anonymous readers.

## Phase 4: Improve Moderation And Recovery

Add tools that make abuse easy to inspect and reverse.

- Add `hiddenReason` and `hiddenBy` details to hidden comments.
- Add a local export report grouped by author login and chapter.
- Add a bulk hide command for one login if an account posts spam.
- Keep original GitHub identity in KV even when a comment is displayed anonymously.

Acceptance criteria:

- Admins can identify the source login behind abusive anonymous comments.
- Admins can hide all feedback from one login without editing KV manually.
- Exported reports include enough context for course staff to audit moderation decisions.
