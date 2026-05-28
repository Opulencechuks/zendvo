import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getAuthPayload } from "@/lib/auth-session";
import { createProblemDetails } from "@/lib/api-utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];
const AVATAR_DIR = join(process.cwd(), "public", "avatars");

function isValidImageType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

function generateAvatarFileName(userId: string, fileExtension: string): string {
  return `${userId}-${Date.now()}${fileExtension}`;
}

function getMimeTypeExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
  };
  return mimeToExt[mimeType] || ".jpg";
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authPayload = await getAuthPayload(request);
    if (!authPayload?.userId) {
      return createProblemDetails(
        "about:blank",
        "Unauthorized",
        401,
        "Authentication required. Please provide a valid Bearer token.",
      );
    }

    // Parse multipart/form-data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Invalid multipart/form-data format",
      );
    }

    // Get file from form data
    const file = formData.get("file") as File | null;
    if (!file) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "No file provided. Please upload an image file.",
      );
    }

    // Validate file type
    if (!isValidImageType(file.type)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        `Invalid file type. Only JPEG and PNG are allowed. Received: ${file.type}`,
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return createProblemDetails(
        "about:blank",
        "Payload Too Large",
        413,
        `File size exceeds 10MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      );
    }

    // Ensure avatar directory exists
    await mkdir(AVATAR_DIR, { recursive: true });

    // Generate unique filename
    const extension = getMimeTypeExtension(file.type);
    const fileName = generateAvatarFileName(authPayload.userId, extension);
    const filePath = join(AVATAR_DIR, fileName);

    // Convert File to Buffer and save
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Construct avatar URL (relative to public folder)
    const avatarUrl = `/avatars/${fileName}`;

    // Update user avatar URL in database
    const updatedUser = await db
      .update(users)
      .set({ avatarUrl })
      .where(eq(users.id, authPayload.userId))
      .returning();

    if (!updatedUser.length) {
      return createProblemDetails(
        "about:blank",
        "Not Found",
        404,
        "User not found",
      );
    }

    const user = updatedUser[0];

    // Return success response with updated user
    return NextResponse.json(
      {
        success: true,
        message: "Avatar uploaded successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Avatar upload error:", error);
    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "An unexpected error occurred while processing your avatar upload",
      `/api/users/avatar`,
      { error: error instanceof Error ? error.message : "Unknown error" },
    );
  }
}
