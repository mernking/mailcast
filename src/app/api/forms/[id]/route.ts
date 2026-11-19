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

function parseFields(raw: string): FormField[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) return parsed as FormField[];
  } catch {
    // fall through
  }
  return [];
}

interface FormWithIncludes {
  id: string;
  name: string;
  fields: string;
  buttonText: string;
  successMessage: string;
  redirectUrl: string | null;
  tagsToAdd: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { submissions: number };
  group: { id: string; name: string } | null;
}

function toFullForm(f: FormWithIncludes) {
  return {
    id: f.id,
    name: f.name,
    fields: parseFields(f.fields),
    buttonText: f.buttonText,
    successMessage: f.successMessage,
    redirectUrl: f.redirectUrl,
    tagsToAdd: f.tagsToAdd,
    accentColor: f.accentColor,
    backgroundColor: f.backgroundColor,
    textColor: f.textColor,
    linkedGroup: f.group ? { id: f.group.id, name: f.group.name } : null,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    submissionCount: f._count.submissions,
  };
}

/**
 * Same linking logic as the POST route. The group owns the link via its
 * unique `formId`. Modes:
 *   - linkGroupId === "__none__": clear any currently-linked group.
 *   - linkGroupId === "<id>": relink to that group.
 *   - createGroupForForm === true: create a new group named after the form.
 * If neither is supplied, the current link is preserved.
 */
async function applyGroupLink(
  formId: string,
  opts: { linkGroupId?: string | null; createGroupForForm?: boolean },
  formName: string
): Promise<{ id: string; name: string } | null> {
  const linkGroupIdRaw =
    typeof opts.linkGroupId === "string" ? opts.linkGroupId.trim() : "";
  const create = opts.createGroupForForm === true;

  if (linkGroupIdRaw === "__none__") {
    await db.contactGroup.updateMany({
      where: { formId },
      data: { formId: null },
    });
    return null;
  }

  let targetGroupId = linkGroupIdRaw;
  if (create && !targetGroupId) {
    const created = await db.contactGroup.create({
      data: { name: formName || "Form group", formId },
      select: { id: true, name: true },
    });
    return { id: created.id, name: created.name };
  }

  if (!targetGroupId) {
    const existing = await db.contactGroup.findFirst({
      where: { formId },
      select: { id: true, name: true },
    });
    return existing ? { id: existing.id, name: existing.name } : null;
  }

  const target = await db.contactGroup.findUnique({
    where: { id: targetGroupId },
    select: { id: true, name: true, formId: true },
  });
  if (!target) return null;

  if (target.formId === formId) {
    return { id: target.id, name: target.name };
  }

  await db.contactGroup.updateMany({
    where: { formId },
    data: { formId: null },
  });
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const form = await db.form.findUnique({
      where: { id },
      include: {
        _count: { select: { submissions: true } },
        group: { select: { id: true, name: true } },
      },
    });
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    return NextResponse.json(toFullForm(form));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load form";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.form.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const patch = (body ?? {}) as {
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

    const data: Record<string, unknown> = {};
    if (typeof patch.name === "string" && patch.name.trim()) {
      data.name = patch.name.trim();
    }
    if (Array.isArray(patch.fields)) {
      data.fields = JSON.stringify(patch.fields);
    }
    if (typeof patch.buttonText === "string") {
      data.buttonText = patch.buttonText.trim() || "Subscribe";
    }
    if (typeof patch.successMessage === "string") {
      data.successMessage =
        patch.successMessage.trim() || "Thanks for subscribing!";
    }
    if (patch.redirectUrl === null) {
      data.redirectUrl = null;
    } else if (typeof patch.redirectUrl === "string") {
      data.redirectUrl = patch.redirectUrl.trim() || null;
    }
    if (typeof patch.tagsToAdd === "string") {
      data.tagsToAdd = patch.tagsToAdd;
    }
    if (typeof patch.accentColor === "string") {
      data.accentColor = patch.accentColor;
    }
    if (typeof patch.backgroundColor === "string") {
      data.backgroundColor = patch.backgroundColor;
    }
    if (typeof patch.textColor === "string") {
      data.textColor = patch.textColor;
    }

    const hasLinkInstruction =
      patch.linkGroupId !== undefined || patch.createGroupForForm === true;

    if (Object.keys(data).length === 0 && !hasLinkInstruction) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    if (Object.keys(data).length > 0) {
      await db.form.update({ where: { id }, data });
    }

    // Resolve the group link instruction (if any).
    if (hasLinkInstruction) {
      await applyGroupLink(
        id,
        { linkGroupId: patch.linkGroupId, createGroupForForm: patch.createGroupForForm },
        typeof data.name === "string" ? data.name : existing.name
      ).catch(() => null);
    }

    const updated = await db.form.findUnique({
      where: { id },
      include: {
        _count: { select: { submissions: true } },
        group: { select: { id: true, name: true } },
      },
    });
    if (!updated) {
      return NextResponse.json(
        { error: "Form not found after update" },
        { status: 404 }
      );
    }

    return NextResponse.json(toFullForm(updated));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update form";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.form.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete form";
    if (/P2025|not found|no record/i.test(message)) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
