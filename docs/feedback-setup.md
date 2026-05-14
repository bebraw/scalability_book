# Feedback Setup

This site has two feedback modes:

- Production feedback runs in the Cloudflare Worker. Students sign in with GitHub and comments are stored in Cloudflare KV.
- Local feedback runs in `npm start`. It stores comments in `.local/comments.json` so you can review and resolve comments while editing chapters locally.

Resolved local comments are synced back to Cloudflare KV with an explicit command. Local editing does not silently write to production.

## 1. Create GitHub OAuth App

Create a GitHub OAuth App under your GitHub account or organization:

- Application name: `Scalable Web feedback`
- Homepage URL: `https://scalableweb.dev`
- Authorization callback URL: `https://scalableweb.dev/api/auth/github/callback`

After creation, keep these values:

- Client ID
- Client secret

The Worker uses GitHub only for identity. It requests the `read:user` scope.

## 2. Create Cloudflare KV Namespace

Create the KV namespace:

```bash
npx wrangler kv namespace create COMMENTS_KV
```

Wrangler prints an `id`. Add that binding to `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "COMMENTS_KV",
    "id": "<comments-kv-namespace-id>",
  },
],
```

Keep the namespace id as well. The local sync commands can use it directly.

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
- `SESSION_SECRET`: long random string used to sign login cookies. Generate one with `openssl rand -base64 32`.
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
4. Post feedback.

Comments are stored under KV keys named `comments:<chapter-slug>`.

Students can see their own comments after posting and any admin replies to those comments. They cannot see comments from other students. Admin users can see all comments and can feature curated reader notes for public display.

Admins can use the feedback view selector in the navigation header to preview three modes:

- `Admin view`: all comments and moderation controls
- `Student view`: the comments visible to the logged-in account as a regular student
- `Public view`: featured reader notes visible to anonymous readers

## 6. Local Review Flow

Pull production comments into the local file:

```bash
npm run comments:pull -- --namespace-id <comments-kv-namespace-id>
```

Start the local editable site:

```bash
npm start
```

In local mode, the site signs you in as `local-editor` and treats you as an admin. Reply, feature, resolve, or hide comments from the page feedback threads while editing chapters.

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

This command only copies local moderation fields and admin replies to matching remote comments. It does not overwrite comment bodies and does not delete remote comments.

To push local moderation state and then refresh `.local/comments.json` from KV:

```bash
npm run comments:sync -- --namespace-id <comments-kv-namespace-id>
```

You can avoid passing `--namespace-id` each time by exporting:

```bash
export COMMENTS_KV_NAMESPACE_ID=<comments-kv-namespace-id>
```

## 8. Troubleshooting

If the feedback controls say login is not configured, check `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `SESSION_SECRET`.

If comments do not load in production, check that `COMMENTS_KV` is bound in `wrangler.jsonc` and redeploy.

If the GitHub callback fails, confirm the OAuth App callback URL is exactly:

```text
https://scalableweb.dev/api/auth/github/callback
```

If `comments:pull` or `comments:push` fails, run `npx wrangler whoami` and confirm Wrangler is authenticated to the Cloudflare account that owns the KV namespace.
