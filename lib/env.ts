import { z } from "zod";

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  EXPO_PUBLIC_SUPABASE_KEY: z.string().min(20).optional(),
  EXPO_PUBLIC_AUTH_PROVIDER: z.enum(["supabase", "better-auth"]).default("supabase"),
  EXPO_PUBLIC_BETTER_AUTH_BASE_URL: z.string().url().optional(),
  EXPO_PUBLIC_ENABLE_PAYSTACK: z.enum(["true", "false"]).default("true"),
  EXPO_PUBLIC_ENABLE_DODO: z.enum(["true", "false"]).default("false")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.message}`);
}

export const env = parsed.data;
export const isSupabaseAuth = env.EXPO_PUBLIC_AUTH_PROVIDER === "supabase";
