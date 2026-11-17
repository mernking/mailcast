import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "name" | "phone";
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

function toFullForm(f: {
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
}) {
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
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    submissionCount: f._count.submissions,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const form = await db.form.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
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

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await db.form.update({
      where: { id },
      data,
      include: { _count: { select: { submissions: true } } },
    });

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
