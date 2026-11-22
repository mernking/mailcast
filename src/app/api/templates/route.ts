import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateTemplate } from "@/lib/template-validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const templates = await db.emailTemplate.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(templates);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load templates";
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

    const { name, project, mjml, html } = (body ?? {}) as {
      name?: string;
      project?: string;
      mjml?: string;
      html?: string;
    };

    const validation = validateTemplate({ name: name ?? "", project, mjml, html });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const template = await db.emailTemplate.create({
      data: {
        name: name!.trim(),
        project: project || "{}",
        mjml: mjml?.trim() || null,
        html: html?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        id: template.id,
        name: template.name,
        project: template.project,
        mjml: template.mjml,
        html: template.html,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
