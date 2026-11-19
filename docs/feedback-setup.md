# Feedback Setup

This site has two feedback modes:

- Production feedback runs in the Cloudflare Worker.
  Students sign in with GitHub and comments are stored in Cloudflare KV.
- Local feedback runs in `npm run dev`.
  It stores comments in `.local/comments.json` so you can review and resolve comments while editing chapters locally.

Resolved local comments are synced back to Cloudflare KV with an explicit command.
Local editing does not silently write to production.

Course-backed peer inquiry is a separate opt-in surface at **Teaching assistant → Peer discussion**.
[Its contract](learning-workspace.md#peer-inquiry-contract) uses course membership and explicit group/cohort audiences, without migrating private feedback.
Public inquiry offers require author consent and course-staff review; reviewed Markdown is handed to the existing book-editor workflow.
This does not change the visibility or featuring rules for existing feedback.

## 1. Create GitHub OAuth App

Create a GitHub OAuth App under your GitHub account or organization:

- Application name: `Scalable Web feedback`
- Homepage URL: `https://scalableweb.dev`
- Authorization callback URL: `https://scalableweb.dev/api/auth/github/callback`

After creation, keep these values:

- Client ID
- Client secret

The Worker uses GitHub only for identity.
It requests the `read:user` scope.

## 2. Create Cloudflare KV Namespace

Create the KV namespace:

```bash
npx wrangler kv namespace create COMMENTS_KV
```

Wrangler prints an `id`.
Add that binding to `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "COMMENTS_KV",
    "id": "<comments-kv-namespace-id>",
  },
],
```

Keep the namespace id as well.
The local sync commands can use it directly.

## 3. Configure Worker Secrets And Vars

Set these values for the deployed Worker:

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
npx wrangler secret put ADMIN_GITHUB_LOGINS
```

Use these meanings:

- `GITHUB_CLIENT_ID`: GitHub OAuth App client id.
- `GITHUB_CLIENT_SECRET`: GitHub OAuth App client secret.
- `SESSION_SECRET`: long random string used to sign login cookies.
  Generate one with `openssl rand -base64 32`.
- `ADMIN_GITHUB_LOGINS`: comma-separated GitHub usernames that can resolve comments, for example `juhovepsalainen`.

`ADMIN_GITHUB_LOGINS` can also be a plain Worker var, but keeping it as a secret is fine.

## 4. Deploy

Build and deploy:

```bash
npm run deploy
```

After deployment, visit:

```text
https://scalableweb.dev/api/auth/status
```

Expected shape:

```json
{
  "available": true,
  "authenticated": false,
  "admin": false,
  "user": null,
  "loginUrl": "/api/auth/github/start"
}
```

If `available` is `false`, the OAuth values or `SESSION_SECRET` are missing.

## 5. Student Feedback Flow

Students use the deployed site:

1. Open a chapter.
2. Select `Sign in` in the navigation header feedback controls.
3. Use the comment control next to a paragraph.
4. Choose a feedback category and post feedback.

Comments are stored under KV keys named `comments:<chapter-slug>`.

Students can see their own visible comments after posting and any admin replies to those comments.
Other readers can see only curated Reader notes that feedback admins explicitly feature for public display.
Public Reader notes omit the author's identity and private replies.
Readers can open a public note through its paragraph badge without signing in.
The related-feedback panel offers **Sign in to comment** to logged-out readers; it opens Account before any comment form appears.
Closing Account leaves the public note available to read.
Admin users can see all feedback records, including the stored author identity when a comment is displayed as anonymous.

Before posting, the form explains this audience and the possibility of a public Reader note, and distinguishes feedback from private Notebook writing and course Peer discussion.
Opening the form focuses the audience explanation so it stays in view; Tab then moves to Category and the remaining fields.
The anonymous checkbox changes the displayed name to **Anonymous student**; its description states that the GitHub identity remains stored in KV and accessible to feedback administrators.
It does not remove identity from the stored record or its admin API response.
After posting, a visible confirmation in the related-feedback panel says the feedback was sent to the book's feedback team and that replies can be read there.
Long words, URLs and author names wrap within feedback cards and their replies, preserving the complete text without widening the related-feedback panel or pushing its controls sideways.

Each chapter also has reflection prompts for unclear points, missing examples, and learned trade-offs.
These are stored as chapter-level feedback.

Admins can use the feedback view selector in the navigation header to preview three modes:

- `Admin view`: all comments and moderation controls
- `Student view`: the comments visible to the logged-in account as a regular student
- `Public view`: featured reader notes visible to anonymous readers

In `Admin view`, moderation controls are available in paragraph feedback threads.
The `Export` button downloads a Markdown summary for the current chapter.
The `Review all` link opens `/admin/feedback/`, where admins can see, search, and filter feedback across every chapter before opening a comment's exact passage.

In local editing mode, admins can promote a featured note into the chapter Markdown as a clarification block.
Promotion appends the clarification to the chapter source and uses the local editor API, so it is not available on the deployed read-only site.

## 6. Local Review Flow

Pull production comments into the local file:

```bash
npm run comments:pull -- --namespace-id <comments-kv-namespace-id>
```

Start the local editable site:

```bash
npm run dev
```

In local mode, the site signs you in as `local-editor` and treats you as an admin.
Reply, feature, resolve with a reason, or hide comments from the page feedback threads while editing chapters.

Local feedback state is stored in:

```text
.local/comments.json
```

This file is ignored by git.

## 7. Push Moderation State Back To KV

After replying, featuring, resolving, or hiding comments locally, push moderation state back to Cloudflare KV:

```bash
npm run comments:push -- --namespace-id <comments-kv-namespace-id>
```

This command only copies local moderation fields and admin replies to matching remote comments.
It does not overwrite comment bodies and does not delete remote comments.

To push local moderation state and then refresh `.local/comments.json` from KV:

```bash
npm run comments:sync -- --namespace-id <comments-kv-namespace-id>
```

You can avoid passing `--namespace-id` each time by exporting:

```bash
export COMMENTS_KV_NAMESPACE_ID=<comments-kv-namespace-id>
```

## Private feedback MCP

The Worker serves a read-only Streamable HTTP MCP endpoint at
`https://scalableweb.dev/api/admin/feedback/mcp` for editorial work in local Codex.
It reads the live feedback store.
`list_feedback` defaults to open issues and returns excerpts with stable IDs, chapter slugs, and links.
Pass `chapter`, `status`, `limit` (up to 20), and `offset` to narrow or page through results.
`get_feedback` takes the `chapter` and `id` from that list and returns the comment, resolution reason, and up to ten replies.
Use `nextReplyOffset` as `replyOffset` to continue.
Threads include the stored paragraph anchor when the page is still published, and reflections link to the chapter.
Older threads can refer to a passage that has since moved.

The tool responses omit reader and moderator account fields.
Comment and reply text can still contain identifying details supplied by their authors.
Review any proposed book edits in the normal editorial workflow.
Use [the feedback dashboard](https://scalableweb.dev/admin/feedback/) to record a resolution or send a reply.

### Enable access for the owner

Set the optional Worker secret `FEEDBACK_MCP_CREDENTIAL` to a JSON object with two keys.
`login` is the single GitHub login authorized for this integration and must already be in `ADMIN_GITHUB_LOGINS`.
`sha256` is the hexadecimal SHA-256 of a locally generated 32-byte base64url bearer token.
For example, in a private terminal, replacing `YOUR_GITHUB_LOGIN`:

```bash
export SCALABLEWEB_FEEDBACK_MCP_TOKEN="$(node -p 'require("node:crypto").randomBytes(32).toString("base64url")')"
node -e 'const { createHash } = require("node:crypto"); process.stdout.write(JSON.stringify({ login: process.argv[1], sha256: createHash("sha256").update(process.env.SCALABLEWEB_FEEDBACK_MCP_TOKEN).digest("hex") }));' YOUR_GITHUB_LOGIN \
  | npx wrangler secret put FEEDBACK_MCP_CREDENTIAL
```

Keep the bearer token in your local credential store and supply it to the Codex host as `SCALABLEWEB_FEEDBACK_MCP_TOKEN`.
Add the server to your local Codex configuration:

```bash
codex mcp add scalableweb-feedback \
  --url https://scalableweb.dev/api/admin/feedback/mcp \
  --bearer-token-env-var SCALABLEWEB_FEEDBACK_MCP_TOKEN
```

Use a Codex session whose process receives that environment variable.
For a desktop client launched outside that shell, a local Codex `http_headers_helper` can read the token from your credential store and supply the `Authorization` header.
Keep the token out of the repository and conversation.
The Worker denies access when the secret is absent or invalid or the configured owner loses feedback-admin access.
Rotate access by replacing the Worker secret and local token together.
Deleting the Worker secret disables the endpoint.

After deployment and setup, verify that an anonymous request receives `401` and an authenticated Codex client discovers exactly `list_feedback` and `get_feedback`.
Use the first tool to select an open issue and the second to verify its thread and passage link.

## 8. Troubleshooting

If the feedback controls say login is not configured, check `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `SESSION_SECRET`.

If comments do not load in production, check that `COMMENTS_KV` is bound in `wrangler.jsonc` and redeploy.

If the GitHub callback fails, confirm the OAuth App callback URL is exactly:

```text
https://scalableweb.dev/api/auth/github/callback
```

If `comments:pull` or `comments:push` fails, run `npx wrangler whoami` and confirm Wrangler is authenticated to the Cloudflare account that owns the KV namespace.

## 9. Bot Hardening

See [Feedback Bot Hardening](feedback-bot-hardening.md) for the abuse-prevention plan around GitHub login and feedback writes.
