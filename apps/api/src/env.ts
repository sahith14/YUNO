function need(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}
function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`${name} must be a number`);
  return n;
}

export const env = {
  PORT: num("API_PORT", 4000),
  HOST: process.env.API_HOST ?? "0.0.0.0",
  NODE_ENV: process.env.NODE_ENV ?? "development",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  PUBLIC_URL: process.env.API_PUBLIC_URL ?? "http://localhost:4000",
  WEB_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  DATABASE_URL: need("DATABASE_URL", "postgresql://yuno:yuno_dev_pw@localhost:5432/yuno"),
  REDIS_URL: need("REDIS_URL", "redis://localhost:6379"),

  JWT_SECRET: need("JWT_SECRET", "dev-only-replace-me-with-64-bytes-of-random-data"),
  JWT_GUEST_TTL: num("JWT_GUEST_TTL", 86_400),
  JWT_USER_TTL: num("JWT_USER_TTL", 2_592_000),

  INTERNAL_SECRET: need("INTERNAL_SECRET", "change-me-internal-secret"),

  TURN_HOST: process.env.TURN_HOST ?? "turn.yuno.local",
  TURN_PORT: num("TURN_PORT", 3478),
  TURN_TLS_PORT: num("TURN_TLS_PORT", 5349),
  TURN_REALM: process.env.TURN_REALM ?? "yuno.local",
  TURN_SHARED_SECRET: process.env.TURN_SHARED_SECRET ?? "change-me-turn-shared-secret",
  TURN_CRED_TTL: num("TURN_CRED_TTL", 3600),
  PUBLIC_STUN_URLS: (process.env.NEXT_PUBLIC_STUN_URLS ?? "stun:stun.l.google.com:19302")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  STRIPE_PRICE_PREMIUM_MONTHLY: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? "",
  STRIPE_PRICE_VERIFIED_FEMALE: process.env.STRIPE_PRICE_VERIFIED_FEMALE ?? "",
  VERIFICATION_WEBHOOK_SECRET: process.env.VERIFICATION_WEBHOOK_SECRET ?? "",

  MODERATION_REPORT_THRESHOLD: num("MODERATION_REPORT_THRESHOLD", 3),
};
