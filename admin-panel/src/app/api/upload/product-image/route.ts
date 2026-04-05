import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public/uploads/product-images");

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

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Allowed: PNG, JPG, SVG, WebP" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "File too large. Max 5MB" },
        { status: 400 }
      );
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const ext = file.name.split(".").pop() || "png";
    const filename = `product_${crypto.randomBytes(8).toString("hex")}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    const buffer = await file.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(buffer));

    const url = `/uploads/product-images/${filename}`;
    return NextResponse.json({ url }, { status: 200 });
  } catch (e: unknown) {
    console.error("Product image upload error:", e);
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}
