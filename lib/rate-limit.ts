import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = Redis.fromEnv();

export const aiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: true,
  prefix: "kaiken:ratelimit:ai",
});

export async function checkAiRateLimit(userId: string) {
  return aiRateLimit.limit(userId);
}