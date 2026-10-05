import type {
  D1Database as RuntimeD1,
  R2Bucket as RuntimeR2,
  Fetcher as RuntimeFetcher,
  FixedLengthStream as RuntimeFixed,
} from "@cloudflare/workers-types";
declare global {
  type D1Database = RuntimeD1;
  type R2Bucket = RuntimeR2;
  type Fetcher = RuntimeFetcher;
  const FixedLengthStream: typeof RuntimeFixed;
}
