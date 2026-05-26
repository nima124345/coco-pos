import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
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

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
