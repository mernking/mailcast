/** Standalone CSV parsing and column mapping shared by the import UI and API. */

export type ColumnMapping =
  | "email"
  | "name"
  | "tags"
  | "telegram"
  | "group"
  | "skip";

export interface MappedContact {
  email: string;
  name: string | null;
  tags: string;
  telegram: string | null;
  groups: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const first = splitCsvLine(lines[0] ?? "");
  const hasHeader = first.some((cell) => /e-?mail/i.test(cell));
  if (hasHeader) {
    return {
      headers: first,
      rows: lines.slice(1).map(splitCsvLine),
    };
  }
  return { headers: [], rows: lines.map(splitCsvLine) };
}

function splitList(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function defaultColumnMapping(
  headers: string[]
): Record<string, ColumnMapping> {
  const mapping: Record<string, ColumnMapping> = {};
  for (const header of headers) {
    if (/e-?mail|address/i.test(header)) mapping[header] = "email";
    else if (/telegram|handle/i.test(header)) mapping[header] = "telegram";
    else if (/name/i.test(header)) mapping[header] = "name";
    else if (/tag/i.test(header)) mapping[header] = "tags";
    else if (/group|segment/i.test(header)) mapping[header] = "group";
    else mapping[header] = "skip";
  }
  return mapping;
}

export function mergeGroups(existing: string[], incoming: string[]): string[] {
  return [...existing, ...incoming].filter(
    (group, index, all) =>
      all.findIndex((g) => g.toLowerCase() === group.toLowerCase()) === index
  );
}

export function mapCsvRows(
  headers: string[],
  rows: string[][],
  mapping: Record<string, ColumnMapping>,
  defaultGroups: string[]
): { contacts: MappedContact[]; skipped: number } {
  const contacts: MappedContact[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  const columnIndex = (field: ColumnMapping): number[] =>
    headers.flatMap((header, index) => (mapping[header] === field ? [index] : []));

  const emailIdx = columnIndex("email");
  const nameIdx = columnIndex("name");
  const tagsIdx = columnIndex("tags");
  const telegramIdx = columnIndex("telegram");
  const groupIdx = columnIndex("group");

  for (const row of rows) {
    const email = (emailIdx.map((i) => row[i] ?? "").find(Boolean) ?? "")
      .trim()
      .toLowerCase();
    if (!EMAIL_RE.test(email) || seen.has(email)) {
      skipped++;
      continue;
    }
    seen.add(email);

    const groups = mergeGroups(
      defaultGroups,
      groupIdx.flatMap((i) => splitList(row[i] ?? ""))
    );

    contacts.push({
      email,
      name: (nameIdx.map((i) => row[i] ?? "").find(Boolean) ?? "").trim() || null,
      tags: tagsIdx.map((i) => row[i] ?? "").filter(Boolean).join(","),
      telegram:
        (telegramIdx.map((i) => row[i] ?? "").find(Boolean) ?? "").trim() || null,
      groups,
    });
  }

  return { contacts, skipped };
}
