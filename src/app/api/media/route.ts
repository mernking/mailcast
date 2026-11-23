import { NextRequest, NextResponse } from "next/server";
import {
  deleteImage,
  getPublicUrl,
  listImages,
  uploadDataUri,
} from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const images = await listImages();
    return NextResponse.json({ images });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list media";
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

    const dataUri = (body as { dataUri?: string } | null)?.dataUri;
    if (!dataUri || !/^data:image\//i.test(dataUri)) {
      return NextResponse.json(
        { error: "A data:image/... URI is required" },
        { status: 400 }
      );
    }

    const stored = await uploadDataUri(dataUri);
    return NextResponse.json(
      {
        path: stored.path,
        url: stored.url ?? getPublicUrl(stored.path),
        mimeType: stored.mimeType,
        size: stored.size,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
