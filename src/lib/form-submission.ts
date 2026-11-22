/** Required-field check for public form submissions. */

export function validateSubmission(
  values: Record<string, string>,
  requiredKeys: string[]
): { ok: boolean; missing: string[] } {
  const byLowerKey = new Map(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), value])
  );
  const missing = requiredKeys.filter((key) => {
    const value = byLowerKey.get(key.toLowerCase());
    return value === undefined || value.trim().length === 0;
  });
  return { ok: missing.length === 0, missing };
}
