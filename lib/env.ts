import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  // Added per milestone as their features land:
  // M2: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET
  // M3: UPLOADTHING_TOKEN
  // M4: GEMINI_API_KEY
  // M7: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

function parseEnv<T extends z.ZodType>(schema: T, label: string) {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error(`Invalid ${label} environment variables:`, parsed.error.flatten().fieldErrors);
    throw new Error(`Invalid ${label} environment variables`);
  }
  return parsed.data as z.infer<T>;
}

/** Server-only environment variables (import from Server Components/Actions only). */
export const serverEnv = parseEnv(serverSchema, "server");

/** Public environment variables (safe to import in client components). */
export const clientEnv = parseEnv(clientSchema, "client");
