import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().default('https://mock-opspilot.supabase.co'),
  SUPABASE_ANON_KEY: z.string().default('mock-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('mock-service-role-key'),
  DATABASE_URL: z.string().optional().default(''),
  JWT_SECRET: z.string().optional().default('opspilot-local-dev-secret-key-change-in-prod'),
  GEMINI_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default('')
});

/**
 * Validates environment configuration against schema
 * @param {Record<string, unknown>} [envInput] - Environment variables object
 * @returns {z.infer<typeof envSchema>}
 */
export const validateEnv = (envInput = process.env) => {
  const result = envSchema.safeParse(envInput);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Environment Validation Error:\n  - ${errorMessages.join('\n  - ')}`);
  }

  // Production security invariant: Disallow default mock keys in production
  if (result.data.NODE_ENV === 'production') {
    if (result.data.SUPABASE_URL.includes('mock-opspilot')) {
      throw new Error(
        'FATAL CONFIGURATION ERROR: Mock Supabase URL detected in production environment!'
      );
    }
    if (result.data.SUPABASE_SERVICE_ROLE_KEY === 'mock-service-role-key') {
      throw new Error(
        'FATAL CONFIGURATION ERROR: Mock Supabase Service Role Key detected in production environment!'
      );
    }
  }

  return result.data;
};

const parsedEnv = validateEnv(process.env);

export const env = {
  PORT: parsedEnv.PORT,
  NODE_ENV: parsedEnv.NODE_ENV,
  CLIENT_URL: parsedEnv.CLIENT_URL,
  SUPABASE_URL: parsedEnv.SUPABASE_URL,
  SUPABASE_ANON_KEY: parsedEnv.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: parsedEnv.SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_URL: parsedEnv.DATABASE_URL,
  JWT_SECRET: parsedEnv.JWT_SECRET,
  GEMINI_API_KEY: parsedEnv.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: parsedEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
  isProduction: parsedEnv.NODE_ENV === 'production',
  isTest: parsedEnv.NODE_ENV === 'test',
  isMockMode:
    !parsedEnv.SUPABASE_URL ||
    parsedEnv.SUPABASE_URL.includes('mock-opspilot') ||
    parsedEnv.NODE_ENV === 'test'
};

export default env;
