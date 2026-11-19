import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ParsedRow {
  email: string;
  name?: string;
  tags?: string;
}

function normalizeTags(tags?: string | string[]): string {
  if (!tags) return "";
  if (Array.isArray(tags)) return tags.map((t) => t.trim()).filter(Boolean).join(",");
  return String(tags)
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .join(",");
}

/**
 * Lenient CSV parser. Detects a header row if present (looks for "email"),
 * otherwise assumes `name,email,tags` or `email` columns. Handles quoted
 * fields simply.
 */
function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const splitLine = (line: string): string[] => {
    // Simple split that handles double-quoted commas.
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };

  const first = splitLine(lines[0]);
  const emailColIdx = first.findIndex((c) => /email|e-mail|address/i.test(c));
  const isHeader = emailColIdx >= 0;

  let nameIdx = -1;
  let tagsIdx = -1;
  let startLine = 0;
  if (isHeader) {
    nameIdx = first.findIndex((c) => /name/i.test(c) && !/email/i.test(c));
    tagsIdx = first.findIndex((c) => /tag/i.test(c));
    startLine = 1;
  } else {
    // No header. Heuristic: find the column that looks like an email.
    const guessEmailIdx = first.findIndex((c) => EMAIL_RE.test(c));
    if (guessEmailIdx < 0) return [];
    // If there are 3 columns and the first is a non-email string, treat it as name.
    if (first.length >= 3 && guessEmailIdx === 1) {
      nameIdx = 0;
      tagsIdx = 2;
    }
  }

  const rows: ParsedRow[] = [];
  for (let i = startLine; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const email = (emailColIdx >= 0 ? cols[emailColIdx] : cols.find((c) => EMAIL_RE.test(c))) || "";
    // Don't filter invalid emails here — the POST handler counts them as
    // skipped rows so the user sees how many were dropped.
    const name = nameIdx >= 0 ? cols[nameIdx] || undefined : undefined;
    const tags = tagsIdx >= 0 ? cols[tagsIdx] || undefined : undefined;
    rows.push({ email: email.toLowerCase(), name, tags });
  }
  return rows;
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const data = (body ?? {}) as {
      contacts?: Array<{ email?: string; name?: string | null; tags?: string | string[] }>;
      csv?: string;
      emails?: string;
    };

    let rows: ParsedRow[] = [];

    if (typeof data.csv === "string" && data.csv.trim()) {
      rows = parseCsv(data.csv);
    } else if (typeof data.emails === "string" && data.emails.trim()) {
      rows = data.emails
        .split(/[\r\n,;\s]+/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0)
        .map((email) => ({ email: email.toLowerCase() }));
    } else if (Array.isArray(data.contacts)) {
      rows = data.contacts
        .map((c) => ({
          email: (c.email || "").trim().toLowerCase(),
          name: c.name && c.name.trim() ? c.name.trim() : undefined,
          tags: typeof c.tags === "string" ? c.tags : Array.isArray(c.tags) ? c.tags.join(",") : undefined,
        }))
        .filter((r) => r.email.length > 0);
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No contacts provided. Paste a CSV, a list of emails, or a JSON array." },
        { status: 400 }
      );
    }

    // Dedupe by email (case-insensitive) keeping insertion order.
    const seen = new Set<string>();
    const uniqueRows: ParsedRow[] = [];
    for (const r of rows) {
      if (!EMAIL_RE.test(r.email)) continue;
      if (seen.has(r.email)) continue;
      seen.add(r.email);
      uniqueRows.push(r);
    }
    const skipped = rows.length - uniqueRows.length;

    let imported = 0;
    let updated = 0;

    for (const row of uniqueRows) {
      // email is indexed but not @unique in the schema, so use findFirst.
      const existing = await db.contact.findFirst({ where: { email: row.email } });
      if (existing) {
        await db.contact.update({
          where: { id: existing.id },
          data: {
            name: row.name ?? existing.name,
            tags: normalizeTags(row.tags ?? existing.tags),
            active: true,
          },
        });
        updated++;
      } else {
        await db.contact.create({
          data: {
            email: row.email,
            name: row.name ?? null,
            tags: normalizeTags(row.tags),
            source: "import",
            active: true,
          },
        });
        imported++;
      }
    }

    return NextResponse.json(
      {
        imported,
        updated,
        skipped,
        total: imported + updated,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to import contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
