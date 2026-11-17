import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "name" | "phone" | "telegram";
  required: boolean;
  placeholder?: string;
}

const DEFAULT_FIELDS: FormField[] = [
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "you@example.com",
  },
];

function parseFields(raw: string): FormField[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) return parsed as FormField[];
  } catch {
    // fall through
  }
  return [];
}

/**
 * Link a form to a ContactGroup. The group owns the link via its unique
 * `formId`. Three modes:
 *   - linkGroupId === "" (clear): unlink any currently-linked group.
 *   - linkGroupId === "<id>": link that group (clearing any other group that
 *     may have pointed at this form first, because formId is @unique).
 *   - createGroupForForm === true: create a new group named after the form
 *     and link it.
 *
 * Returns the freshly-linked group {id, name} or null when nothing is linked.
 */
async function applyGroupLink(
  formId: string,
  opts: { linkGroupId?: string | null; createGroupForForm?: boolean },
  formName: string
): Promise<{ id: string; name: string } | null> {
  const linkGroupIdRaw =
    typeof opts.linkGroupId === "string" ? opts.linkGroupId.trim() : "";
  const create = opts.createGroupForForm === true;

  // Explicit "clear" intent.
  if (linkGroupIdRaw === "__none__") {
    await db.contactGroup.updateMany({
      where: { formId },
      data: { formId: null },
    });
    return null;
  }

  // Pick a target group id (existing or freshly created).
  let targetGroupId = linkGroupIdRaw;
  if (create && !targetGroupId) {
    const created = await db.contactGroup.create({
      data: { name: formName || "Form group", formId },
      select: { id: true, name: true },
    });
    // Already linked via create — no further work needed.
    return { id: created.id, name: created.name };
  }

  if (!targetGroupId) {
    // No instruction to change anything — keep current link as-is.
    const existing = await db.contactGroup.findFirst({
      where: { formId },
      select: { id: true, name: true },
    });
    return existing ? { id: existing.id, name: existing.name } : null;
  }

  // Verify the target group exists.
  const target = await db.contactGroup.findUnique({
    where: { id: targetGroupId },
    select: { id: true, name: true, formId: true },
  });
  if (!target) return null;

  if (target.formId === formId) {
    // Already linked.
    return { id: target.id, name: target.name };
  }

  // Clear any prior group currently linked to this form (formId is @unique).
  await db.contactGroup.updateMany({
    where: { formId },
    data: { formId: null },
  });
  // And take the slot.
  await db.contactGroup.update({
    where: { id: target.id },
    data: { formId },
  });

  return { id: target.id, name: target.name };
}

async function currentLinkedGroup(
  formId: string
): Promise<{ id: string; name: string } | null> {
  const g = await db.contactGroup.findFirst({
    where: { formId },
    select: { id: true, name: true },
  });
  return g ? { id: g.id, name: g.name } : null;
}

export async function GET() {
  try {
    const forms = await db.form.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { submissions: true } },
        group: { select: { id: true, name: true } },
      },
    });

    const items = forms.map((f) => ({
      id: f.id,
      name: f.name,
      buttonText: f.buttonText,
      tagsToAdd: f.tagsToAdd,
      fields: parseFields(f.fields),
      accentColor: f.accentColor,
      backgroundColor: f.backgroundColor,
      textColor: f.textColor,
      linkedGroup: f.group
        ? { id: f.group.id, name: f.group.name }
        : null,
      createdAt: f.createdAt,
      submissionCount: f._count.submissions,
    }));

    return NextResponse.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load forms";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const b = (body ?? {}) as {
      name?: string;
      fields?: FormField[];
      buttonText?: string;
      successMessage?: string;
      redirectUrl?: string | null;
      tagsToAdd?: string;
      accentColor?: string;
      backgroundColor?: string;
      textColor?: string;
      linkGroupId?: string | null;
      createGroupForForm?: boolean;
    };

    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Form name is required" }, { status: 400 });
    }

    const fields =
      Array.isArray(b.fields) && b.fields.length > 0 ? b.fields : DEFAULT_FIELDS;

    const created = await db.form.create({
      data: {
        name,
        fields: JSON.stringify(fields),
        buttonText:
          typeof b.buttonText === "string" && b.buttonText.trim()
            ? b.buttonText.trim()
            : "Subscribe",
        successMessage:
          typeof b.successMessage === "string" && b.successMessage.trim()
            ? b.successMessage.trim()
            : "Thanks for subscribing!",
        redirectUrl:
          typeof b.redirectUrl === "string" && b.redirectUrl.trim()
            ? b.redirectUrl.trim()
            : null,
        tagsToAdd: typeof b.tagsToAdd === "string" ? b.tagsToAdd : "",
        accentColor: typeof b.accentColor === "string" ? b.accentColor : "#1a1a1a",
        backgroundColor:
          typeof b.backgroundColor === "string" ? b.backgroundColor : "#ffffff",
        textColor: typeof b.textColor === "string" ? b.textColor : "#1a1a1a",
      },
      include: { _count: { select: { submissions: true } } },
    });

    // Resolve the group link instruction (after the form exists).
    const linked = await applyGroupLink(
      created.id,
      { linkGroupId: b.linkGroupId, createGroupForForm: b.createGroupForForm },
      created.name
    ).catch(() => null);
    const finalLinked = linked ?? (await currentLinkedGroup(created.id));

    return NextResponse.json(
      {
        id: created.id,
        name: created.name,
        fields: parseFields(created.fields),
        buttonText: created.buttonText,
        successMessage: created.successMessage,
        redirectUrl: created.redirectUrl,
        tagsToAdd: created.tagsToAdd,
        accentColor: created.accentColor,
        backgroundColor: created.backgroundColor,
        textColor: created.textColor,
        linkedGroup: finalLinked,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        submissionCount: created._count.submissions,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create form";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
