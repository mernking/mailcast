import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrollContact, processDueEnrollments } from "@/lib/automation";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function normalizeTags(tags?: string | string[]): string[] {
  if (!tags) return [];
  const arr = Array.isArray(tags) ? tags : String(tags).split(/[,;]/);
  return arr
    .map((t) => t.trim())
    .filter(Boolean);
}

function mergeTags(existing: string, add: string[]): string {
  const set = new Set<string>();
  for (const t of normalizeTags(existing)) set.add(t);
  for (const t of add) set.add(t.toLowerCase());
  return Array.from(set).join(",");
}

/**
 * Parse the incoming request body. Embedded forms may post JSON or
 * URL-encoded form data. We accept both. For multipart, we also try
 * formData().
 */
async function parseBody(req: NextRequest): Promise<Record<string, string>> {
  const ct = (req.headers.get("content-type") || "").toLowerCase();

  if (ct.includes("application/json")) {
    try {
      const json = (await req.json()) as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(json || {})) {
        if (v === null || v === undefined) continue;
        if (typeof v === "object") continue;
        out[k] = String(v);
      }
      return out;
    } catch {
      return {};
    }
  }

  // url-encoded or multipart → use formData()
  try {
    const fd = await req.formData();
    const out: Record<string, string> = {};
    fd.forEach((value, key) => {
      if (typeof value === "string") {
        out[key] = value;
      }
    });
    return out;
  } catch {
    return {};
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const form = await db.form.findUnique({
      where: { id },
      include: { group: { select: { id: true } } },
    });
    if (!form) {
      return NextResponse.json(
        { ok: false, error: "Form not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const values = await parseBody(req);

    const email = (values.email || values.EMAIL || values.Email || "")
      .toString()
      .trim()
      .toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, error: "A valid email is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Pull `name` from a few common keys, then collect everything else
    // (other than the email we already used) into a `data` object.
    const nameRaw =
      values.name || values.NAME || values.Name || values.full_name || "";
    const name = nameRaw.toString().trim() || null;

    // Telegram username (collected via a "telegram" field type on the form).
    const telegramRaw =
      values.telegram ||
      values.Telegram ||
      values.telegram_username ||
      values.handle ||
      "";
    const telegram = telegramRaw
      ? telegramRaw.toString().trim().replace(/^@/, "")
      : null;

    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      const lower = k.toLowerCase();
      if (lower === "email") continue;
      if (lower === "name" || k === "NAME" || k === "Name") continue;
      if (lower === "full_name") continue;
      if (lower === "telegram" || lower === "telegram_username" || lower === "handle") continue;
      data[k] = v;
    }
    if (name && !("name" in data)) {
      // keep the name in data too so it shows up in submission exports
      data.name = name;
    }
    if (telegram) data.telegram = telegram;

    const tagsToAdd = normalizeTags(form.tagsToAdd);

    // Upsert contact (email is not @unique, so use findFirst like contacts API).
    const existing = await db.contact.findFirst({ where: { email } });
    let contactId: string;
    let isNewContact = false;
    if (existing) {
      const updated = await db.contact.update({
        where: { id: existing.id },
        data: {
          name: name ?? existing.name,
          tags: mergeTags(existing.tags, tagsToAdd),
          telegram: telegram ?? existing.telegram,
          active: true,
        },
        select: { id: true },
      });
      contactId = updated.id;
    } else {
      const created = await db.contact.create({
        data: {
          email,
          name,
          tags: tagsToAdd.join(","),
          source: "form",
          active: true,
          telegram,
        },
        select: { id: true },
      });
      contactId = created.id;
      isNewContact = true;
    }

    await db.formSubmission.create({
      data: {
        formId: form.id,
        email,
        name,
        data: JSON.stringify(data),
        contactId,
      },
    });

    // Add the contact to the form's linked group (if any).
    let addedToGroup = false;
    if (form.group?.id) {
      try {
        await db.contactGroupAssignment.upsert({
          where: { contactId_groupId: { contactId, groupId: form.group.id } },
          create: { contactId, groupId: form.group.id },
          update: {},
        });
        addedToGroup = true;
      } catch {
        /* best-effort */
      }
    }

    // Trigger automations, then immediately process due steps so a no-delay
    // welcome email sends right away. Failures here never break the submit.
    try {
      if (isNewContact) {
        await enrollContact(contactId, "contact_added", {});
      }
      await enrollContact(contactId, "form_submit", { formId: form.id });
      if (addedToGroup && form.group?.id) {
        await enrollContact(contactId, "contact_added_to_group", { groupId: form.group.id });
      }
      await processDueEnrollments();
    } catch {
      // Automations failing should never break the submit response.
    }

    return NextResponse.json(
      { ok: true, message: form.successMessage },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to submit form";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
