import { z } from 'zod';

const envSchema = z
  .object({
    VITE_SKAFTIN_API_URL: z
      .string()
      .url('VITE_SKAFTIN_API_URL must be a valid URL')
      .default('http://localhost:4006'),
    VITE_SKAFTIN_API_KEY: z.string().optional().default(''),
    VITE_SKAFTIN_API: z.string().optional().default(''),
    VITE_SKAFTIN_ACCESS_TOKEN: z.string().optional().default(''),
    VITE_SKAFTIN_PROJECT_ID: z.string().optional().default(''),
  })
  .refine(
    (v) => !!(v.VITE_SKAFTIN_API_KEY || v.VITE_SKAFTIN_API || v.VITE_SKAFTIN_ACCESS_TOKEN),
    {
      message:
        'Skaftin credentials required. Set VITE_SKAFTIN_API_KEY or VITE_SKAFTIN_ACCESS_TOKEN in your .env file.',
    },
  );

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const raw = {
    VITE_SKAFTIN_API_URL: import.meta.env.VITE_SKAFTIN_API_URL,
    VITE_SKAFTIN_API_KEY: import.meta.env.VITE_SKAFTIN_API_KEY,
    VITE_SKAFTIN_API: import.meta.env.VITE_SKAFTIN_API,
    VITE_SKAFTIN_ACCESS_TOKEN: import.meta.env.VITE_SKAFTIN_ACCESS_TOKEN,
    VITE_SKAFTIN_PROJECT_ID: import.meta.env.VITE_SKAFTIN_PROJECT_ID,
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.message}`)
      .join('\n');
    console.error(`[env] Invalid environment configuration:\n${formatted}`);

    if (import.meta.env.DEV) {
      console.warn('[env] Falling back to defaults in development mode.');
      return envSchema.parse({
        ...raw,
        VITE_SKAFTIN_API_KEY: raw.VITE_SKAFTIN_API_KEY || 'dev_placeholder',
      });
    }

    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return result.data;
}

export const env = parseEnv();
