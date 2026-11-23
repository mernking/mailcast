/**
 * Resolve the database URL Prisma should actually use.
 *
 * Supabase's direct connection (`db.<ref>.supabase.co:5432`) is often blocked
 * from hosting platforms and serverless runtimes. The pooler endpoint works in
 * those environments, so we rewrite direct URLs to the pooler automatically.
 *
 * Set DATABASE_POOLER_URL (or SUPABASE_POOLER_HOST) to override the defaults.
 */
export function resolveDatabaseUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (process.env.DATABASE_POOLER_URL) return process.env.DATABASE_POOLER_URL;

  try {
    const url = new URL(raw);
    const match = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (match) {
      const projectRef = match[1];
      url.hostname =
        process.env.SUPABASE_POOLER_HOST || "aws-0-eu-west-1.pooler.supabase.com";
      url.port = "5432";
      url.username = `postgres.${projectRef}`;
      return url.toString();
    }
  } catch {
    // Not a parseable URL — let Prisma report the original error.
  }

  return raw;
}
