import {
  companionRelease,
  type CompanionStatus,
} from "../../shared/learning-connection.ts";
export class LearningConnectionError extends Error {
  readonly reason: "network" | "session" | "protocol";
  constructor(message: string, reason: "network" | "session" | "protocol") {
    super(message);
    this.reason = reason;
  }
}
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
    if (url.origin !== this.base) this.clearSession();
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
      throw new LearningConnectionError(
        "The browser could not reach the companion. Check that it is running at this address, that this exact website origin is allowed, and that your browser permits local-network access. The browser cannot tell us which of these caused the failure. Run doctor in your terminal for local checks.",
        "network",
      );
    } finally {
      clearTimeout(timeout);
    }
    const data = (await response.json()) as T & { message?: string };
    if (!response.ok) {
      if (response.status === 401) {
        this.clearSession();
        throw new LearningConnectionError(
          `${data.message ?? "The companion session is unavailable."} Choose Connect companion again. Your stored notebook and this draft are retained.`,
          "session",
        );
      }
      throw new Error(data.message ?? "The companion request failed.");
    }
    return data;
  }
  compatible(version: number) {
    if (version !== companionRelease.protocol)
      throw new LearningConnectionError(
        `This book needs companion protocol ${companionRelease.protocol}; this companion reports ${version}. Use the documented compatible package version and restart. Your stored work has not changed.`,
        "protocol",
      );
  }
  async status() {
    const status = await this.request<CompanionStatus>("/status");
    this.compatible(status.version);
    return status;
  }
  async connect(base: string) {
    this.setBase(base);
    const result = await this.request<{ token: string; version: number }>(
      "/connect",
      "POST",
      {},
    );
    this.retainSession(result);
  }
  private retainSession(result: { token: string; version: number }) {
    this.compatible(result.version);
    if (!/^[A-Za-z0-9_-]{43}$/.test(result.token))
      throw new LearningConnectionError(
        "The companion returned an invalid session. Restart it and reconnect.",
        "session",
      );
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
    this.clearSession();
  }
  clearSession() {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("book-learning-connection") ?? "null",
      ) as { base: string; token: string } | null;
      // A delayed restore check must not erase a newly connected session.
      if (saved?.base === this.base && saved.token === this.token)
        sessionStorage.removeItem("book-learning-connection");
    } catch {
      /* Memory-only fallback. */
    }
    this.token = "";
  }
}
