"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUT = PUT;
const server_1 = require("next/server");
const zod_1 = require("zod");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_session_1 = require("@/lib/auth-session");
const api_utils_1 = require("@/lib/api-utils");
const validation_1 = require("@/lib/validation");
const UpdateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    phoneNumber: zod_1.z.string().optional(),
});
async function PUT(request) {
    try {
        // Authenticate user
        const payload = await (0, auth_session_1.getAuthPayload)(request);
        if (!payload) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
        }
        // Parse request body
        let body;
        try {
            body = await request.json();
        }
        catch {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid JSON payload");
        }
        // Validate schema
        const validationResult = UpdateProfileSchema.safeParse(body);
        if (!validationResult.success) {
            const firstError = validationResult.error.issues[0];
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, firstError.message);
        }
        const { firstName, lastName, email, phoneNumber } = validationResult.data;
        // Build update object
        const updateData = {};
        let fullName = null;
        // Validate and set name fields
        if (firstName !== undefined || lastName !== undefined) {
            const first = firstName ? (0, validation_1.sanitizeInput)(firstName) : "";
            const last = lastName ? (0, validation_1.sanitizeInput)(lastName) : "";
            fullName = `${first} ${last}`.trim() || null;
            updateData.name = fullName;
        }
        // Validate and set email
        if (email !== undefined) {
            const sanitizedEmail = (0, validation_1.sanitizeInput)(email);
            if (!(0, validation_1.validateEmail)(sanitizedEmail)) {
                return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid email format");
            }
            updateData.email = sanitizedEmail;
        }
        // Validate and set phone number
        if (phoneNumber !== undefined) {
            if (phoneNumber === null || phoneNumber === "") {
                updateData.phoneNumber = null;
            }
            else {
                if (!(0, validation_1.validateE164PhoneNumber)(phoneNumber)) {
                    return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid phone number format");
                }
                const sanitizedPhone = (0, validation_1.sanitizePhoneNumber)(phoneNumber);
                updateData.phoneNumber = sanitizedPhone;
            }
        }
        // If no updates provided, return current user
        if (Object.keys(updateData).length === 0) {
            const user = await db_1.db.query.users.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.users.id, payload.userId),
                columns: {
                    id: true,
                    email: true,
                    name: true,
                    phoneNumber: true,
                    role: true,
                    status: true,
                },
            });
            if (!user) {
                return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "User not found");
            }
            return server_1.NextResponse.json({
                success: true,
                user,
            }, { status: 200 });
        }
        // Check if email is already taken (if updating email)
        if (updateData.email) {
            const existingUser = await db_1.db.query.users.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.users.email, updateData.email),
            });
            if (existingUser && existingUser.id !== payload.userId) {
                return (0, api_utils_1.createProblemDetails)("about:blank", "Conflict", 409, "Email already in use");
            }
        }
        // Check if phone number is already taken (if updating phone)
        if (updateData.phoneNumber) {
            const existingUser = await db_1.db.query.users.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.users.phoneNumber, updateData.phoneNumber),
            });
            if (existingUser && existingUser.id !== payload.userId) {
                return (0, api_utils_1.createProblemDetails)("about:blank", "Conflict", 409, "Phone number already in use");
            }
        }
        // Update user in database
        updateData.updatedAt = new Date();
        const updatedUser = await db_1.db
            .update(schema_1.users)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, payload.userId))
            .returning({
            id: schema_1.users.id,
            email: schema_1.users.email,
            name: schema_1.users.name,
            phoneNumber: schema_1.users.phoneNumber,
            role: schema_1.users.role,
            status: schema_1.users.status,
        });
        if (!updatedUser.length) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "User not found");
        }
        const user = updatedUser[0];
        return server_1.NextResponse.json({
            success: true,
            user,
        }, { status: 200 });
    }
    catch (error) {
        console.error("Error in users/profile PUT:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
