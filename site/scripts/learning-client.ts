export class LearningClient {
  base = "http://127.0.0.1:8788";
  token = "";
  constructor() {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("book-learning-connection") ?? "null",
      ) as { base: string; token: string } | null;
      if (saved) {
        this.setBase(saved.base);
        this.token = saved.token;
      }
    } catch {
      /* A connection can still be used when tab storage is unavailable. */
    }
  }
  setBase(value: string) {
    const url = new URL(value);
    if (
      url.protocol !== "http:" ||
      url.hostname !== "127.0.0.1" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error("Use the companion’s http://127.0.0.1 address and port.");
    this.base = url.origin;
  }
  async request<T>(route: string, method = "GET", body?: unknown): Promise<T> {
    let response: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      response = await fetch(`${this.base}${route}`, {
        method,
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
    } catch {
      throw new Error(
        "The companion could not be reached. Start it, allow this website’s local-network request if your browser asks, and check the address.",
      );
    } finally {
      clearTimeout(timeout);
    }
    const data = (await response.json()) as T & { message?: string };
    if (!response.ok)
      throw new Error(data.message ?? "The companion request failed.");
    return data;
  }
  async pair(base: string, code: string) {
    this.setBase(base);
    const result = await this.request<{ token: string }>("/pair", "POST", {
      code,
    });
    this.token = result.token;
    try {
      sessionStorage.setItem(
        "book-learning-connection",
        JSON.stringify({ base: this.base, token: this.token }),
      );
    } catch {
      /* Memory-only fallback. */
    }
  }
  async disconnect() {
    await this.request("/disconnect", "POST", {});
    this.token = "";
    try {
      sessionStorage.removeItem("book-learning-connection");
    } catch {
      /* Memory-only fallback. */
    }
  }
}
