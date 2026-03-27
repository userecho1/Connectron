import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TRANSPORT_MODE: z.enum(['stdio', 'sse', 'http']).default('stdio'),
  PORT: z.string().default('3000').transform(Number),
  API_KEY: z.string().optional(),
  // Database
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().transform(Number).optional(),
  DB_USER: z.string().optional(),
  DB_PASS: z.string().optional(),
  DB_NAME: z.string().optional(),
  // GitHub
  GITHUB_TOKEN: z.string().optional(),
  // Jira
  JIRA_HOST: z.string().optional(),
  JIRA_EMAIL: z.string().optional(),
  JIRA_API_TOKEN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
