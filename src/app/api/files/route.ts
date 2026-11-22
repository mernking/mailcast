import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAllowedImage } from "@/lib/file-types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A file is required" }, { status: 400 });
    }
    if (!isAllowedImage(file.type, file.size)) {
      return NextResponse.json(
        { error: "Use a PNG, JPEG, GIF or WebP image under 5 MB" },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const created = await db.storedFile.create({
      data: {
        name: file.name || "image",
        mimeType: file.type.toLowerCase(),
        size: file.size,
        data: bytes,
      },
      select: { id: true },
    });

    return NextResponse.json(
      { id: created.id, url: `/api/files/${created.id}` },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
