import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/session";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ url: "" });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ url: "" });
  }

  // Reject anything that isn't a reasonably-sized image before touching storage.
  const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
  if (file.type && !file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "รองรับเฉพาะไฟล์รูปภาพ", url: "" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "ไฟล์ใหญ่เกินไป (สูงสุด 8MB)", url: "" },
      { status: 400 }
    );
  }

  // Production: use Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`menu/${Date.now()}-${file.name}`, file, {
        access: "public",
      });
      return NextResponse.json({ url: blob.url });
    } catch {
      return NextResponse.json({ url: "" });
    }
  }

  // Local dev: write to filesystem
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || ".jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "menu");
    const filePath = path.join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    return NextResponse.json({ url: `/uploads/menu/${filename}` });
  } catch {
    return NextResponse.json({ url: "" });
  }
}
