import { z } from "zod";

const booleanFromEnv = z
  .string()
  .optional()
  .transform((value) => value === "true" || value === "1");

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  ALLOWED_EMAILS: z.string().min(1).optional(),
  RPI_HOST: z.string().min(1).optional(),
  RPI_PORT: z.coerce.number().int().positive().default(22),
  RPI_USERNAME: z.string().min(1).optional(),
  RPI_PRIVATE_KEY: z.string().min(1).optional(),
  RPI_PASSWORD: z.string().min(1).optional(),
  RPI_STREAM_COMMAND: z.string().min(1).optional(),
  RPI_COMMAND_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  NEXT_PUBLIC_STREAM_URL: z.string().url().optional(),
  NEXT_PUBLIC_STREAM_KIND: z.enum(["iframe", "video"]).default("iframe"),
  DEMO_MODE: booleanFromEnv.default(false)
});

export const env = envSchema.parse(process.env);

export function getAllowedEmails() {
  return (env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email?: string | null) {
  if (!email) return false;
  const allowedEmails = getAllowedEmails();
  return allowedEmails.includes(email.toLowerCase());
}

export function getMissingRuntimeConfig() {
  const missing: string[] = [];

  if (!env.RPI_HOST) missing.push("RPI_HOST");
  if (!env.RPI_USERNAME) missing.push("RPI_USERNAME");
  if (!env.RPI_PRIVATE_KEY && !env.RPI_PASSWORD) {
    missing.push("RPI_PRIVATE_KEY o RPI_PASSWORD");
  }
  if (!env.RPI_STREAM_COMMAND) missing.push("RPI_STREAM_COMMAND");

  return missing;
}
