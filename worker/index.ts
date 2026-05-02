import { assetManifest } from "./generated/asset-manifest";

type Env = {
  ASSETS: Fetcher;
};

const immutableAssetPattern =
  /\.(?:css|js|mjs|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?)$/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/__worker/health") {
      return Response.json({
        ok: true,
        assets: assetManifest.length,
      });
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);

    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    if (response.ok && immutableAssetPattern.test(url.pathname)) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (
      response.ok &&
      response.headers.get("content-type")?.includes("text/html")
    ) {
      headers.set("Cache-Control", "public, max-age=300");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
