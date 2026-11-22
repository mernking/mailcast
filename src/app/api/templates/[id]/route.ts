import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateTemplate } from "@/lib/template-validation";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await db.emailTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: template.id,
      name: template.name,
      project: template.project,
      mjml: template.mjml,
      html: template.html,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const template = await db.emailTemplate.update({
      where: { id },
      data: {
        name: name!.trim(),
        project: project || "{}",
        mjml: mjml?.trim() || null,
        html: html?.trim() || null,
      },
    });

    return NextResponse.json({
      id: template.id,
      name: template.name,
      project: template.project,
      mjml: template.mjml,
      html: template.html,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.emailTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}