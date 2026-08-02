import { z } from 'zod';
import { logger } from '../utils/logger';

const envSchema = z.object({
  VITE_API_URL: z
    .string()
    .url('VITE_API_URL must be a valid URL')
    .default('http://localhost:4003'),
  VITE_WS_URL: z.string().url('VITE_WS_URL must be a valid URL').optional().default(''),
  VITE_GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const raw = {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_WS_URL: import.meta.env.VITE_WS_URL,
    VITE_GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.message}`)
      .join('\n');
    logger.error(`[env] Invalid environment configuration:\n${formatted}`);

    if (import.meta.env.DEV) {
      logger.warn('[env] Falling back to defaults in development mode.');
      return envSchema.parse(raw);
    }

    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return result.data;
}

export const env = parseEnv();
