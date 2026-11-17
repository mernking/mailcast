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

export async function GET() {
  try {
    const forms = await db.form.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { submissions: true } } },
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
