"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const drizzle_orm_1 = require("drizzle-orm");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const auth_session_1 = require("@/lib/auth-session");
const api_utils_1 = require("@/lib/api-utils");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];
const AVATAR_DIR = (0, node_path_1.join)(process.cwd(), "public", "avatars");
function isValidImageType(mimeType) {
    return ALLOWED_MIME_TYPES.includes(mimeType);
}
function generateAvatarFileName(userId, fileExtension) {
    return `${userId}-${Date.now()}${fileExtension}`;
}
function getMimeTypeExtension(mimeType) {
    const mimeToExt = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
    };
    return mimeToExt[mimeType] || ".jpg";
}
async function POST(request) {
    try {
        // Authenticate user
        const authPayload = await (0, auth_session_1.getAuthPayload)(request);
        if (!authPayload?.userId) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Authentication required. Please provide a valid Bearer token.");
        }
        // Parse multipart/form-data
        let formData;
        try {
            formData = await request.formData();
        }
        catch {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid multipart/form-data format");
        }
        // Get file from form data
        const file = formData.get("file");
        if (!file) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "No file provided. Please upload an image file.");
        }
        // Validate file type
        if (!isValidImageType(file.type)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, `Invalid file type. Only JPEG and PNG are allowed. Received: ${file.type}`);
        }
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Payload Too Large", 413, `File size exceeds 10MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        }
        // Ensure avatar directory exists
        await (0, promises_1.mkdir)(AVATAR_DIR, { recursive: true });
        // Generate unique filename
        const extension = getMimeTypeExtension(file.type);
        const fileName = generateAvatarFileName(authPayload.userId, extension);
        const filePath = (0, node_path_1.join)(AVATAR_DIR, fileName);
        // Convert File to Buffer and save
        const buffer = Buffer.from(await file.arrayBuffer());
        await (0, promises_1.writeFile)(filePath, buffer);
        // Construct avatar URL (relative to public folder)
        const avatarUrl = `/avatars/${fileName}`;
        // Update user avatar URL in database
        const updatedUser = await db_1.db
            .update(schema_1.users)
            .set({ avatarUrl })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, authPayload.userId))
            .returning();
        if (!updatedUser.length) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "User not found");
        }
        const user = updatedUser[0];
        // Return success response with updated user
        return server_1.NextResponse.json({
            success: true,
            message: "Avatar uploaded successfully",
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
            },
        }, { status: 200 });
    }
    catch (error) {
        console.error("Avatar upload error:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "An unexpected error occurred while processing your avatar upload", `/api/users/avatar`, { error: error instanceof Error ? error.message : "Unknown error" });
    }
}
