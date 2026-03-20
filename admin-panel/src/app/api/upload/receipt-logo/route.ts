import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public/uploads/receipt-logos");

export async function POST(req: Request) {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ message: "No token" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Allowed: PNG, JPG, SVG, WebP" },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "File too large. Max 5MB" },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (e) {
      // Directory might already exist, that's fine
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "png";
    const filename = `logo_${crypto.randomBytes(8).toString("hex")}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Write file
    const buffer = await file.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(buffer));

    // Return URL path relative to public folder
    const url = `/uploads/receipt-logos/${filename}`;

    return NextResponse.json({ url }, { status: 200 });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json(
      { message: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
