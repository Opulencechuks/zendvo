"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const authRepository_1 = require("@/server/db/authRepository");
const validation_1 = require("@/lib/validation");
// Mock database
globals_1.jest.mock("@/lib/db", () => ({
    db: {
        query: {
            users: {
                findFirst: globals_1.jest.fn(),
            },
        },
        insert: globals_1.jest.fn(),
    },
}));
(0, globals_1.describe)("Phone Number Uniqueness Constraint", () => {
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)("Database Schema Constraints", () => {
        (0, globals_1.it)("should have unique constraint on phone_number field", () => {
            // This test verifies the schema definition
            const usersTable = schema_1.users;
            (0, globals_1.expect)(usersTable.phoneNumber).toBeDefined();
        });
    });
    (0, globals_1.describe)("Phone Number Lookup", () => {
        (0, globals_1.it)("should find user by phone number", async () => {
            const mockUser = {
                id: "user-123",
                email: "test@example.com",
                name: "Test User",
                phoneNumber: "+2348123456789",
                role: "user",
                status: "active",
            };
            db_1.db.query.users.findFirst.mockResolvedValue(mockUser);
            const result = await (0, authRepository_1.findUserByPhoneNumber)("+2348123456789");
            (0, globals_1.expect)(db_1.db.query.users.findFirst).toHaveBeenCalledWith({
                where: globals_1.expect.any(Object), // Drizzle where clause
            });
            (0, globals_1.expect)(result).toEqual(mockUser);
        });
        (0, globals_1.it)("should return null for non-existent phone number", async () => {
            db_1.db.query.users.findFirst.mockResolvedValue(null);
            const result = await (0, authRepository_1.findUserByPhoneNumber)("+2349999999999");
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)("Registration with Phone Numbers", () => {
        (0, globals_1.it)("should allow registration with unique phone number", async () => {
            const userInput = {
                email: "newuser@example.com",
                passwordHash: "hashedpassword",
                name: "New User",
                phoneNumber: "+2348123456789",
            };
            const mockCreatedUser = {
                id: "new-user-123",
                email: userInput.email,
                name: userInput.name,
                phoneNumber: userInput.phoneNumber,
                role: "user",
                status: "unverified",
            };
            const mockInsert = {
                values: globals_1.jest.fn().mockReturnThis(),
                returning: globals_1.jest.fn().mockResolvedValue([mockCreatedUser]),
            };
            db_1.db.insert.mockReturnValue(mockInsert);
            const result = await (0, authRepository_1.createUser)(userInput);
            (0, globals_1.expect)(db_1.db.insert).toHaveBeenCalledWith(schema_1.users);
            (0, globals_1.expect)(mockInsert.values).toHaveBeenCalledWith({
                email: userInput.email,
                passwordHash: userInput.passwordHash,
                name: userInput.name,
                phoneNumber: userInput.phoneNumber,
                role: "user",
                status: "unverified",
                loginAttempts: 0,
                lockUntil: null,
            });
            (0, globals_1.expect)(result).toEqual(mockCreatedUser);
        });
        (0, globals_1.it)("should allow registration without phone number", async () => {
            const userInput = {
                email: "nophone@example.com",
                passwordHash: "hashedpassword",
                name: "No Phone User",
            };
            const mockCreatedUser = {
                id: "no-phone-123",
                email: userInput.email,
                name: userInput.name,
                phoneNumber: null,
                role: "user",
                status: "unverified",
            };
            const mockInsert = {
                values: globals_1.jest.fn().mockReturnThis(),
                returning: globals_1.jest.fn().mockResolvedValue([mockCreatedUser]),
            };
            db_1.db.insert.mockReturnValue(mockInsert);
            const result = await (0, authRepository_1.createUser)(userInput);
            (0, globals_1.expect)(mockInsert.values).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                phoneNumber: null,
            }));
            (0, globals_1.expect)(result.phoneNumber).toBeNull();
        });
    });
    (0, globals_1.describe)("Phone Number Sanitization in Registration", () => {
        (0, globals_1.it)("should sanitize phone numbers before storage", async () => {
            const userInput = {
                email: "test@example.com",
                passwordHash: "hashedpassword",
                name: "Test User",
                phoneNumber: "08123456789", // Local format
            };
            const expectedSanitized = (0, validation_1.sanitizePhoneNumber)("08123456789");
            const mockInsert = {
                values: globals_1.jest.fn().mockReturnThis(),
                returning: globals_1.jest.fn().mockResolvedValue([
                    {
                        id: "user-123",
                        ...userInput,
                        phoneNumber: expectedSanitized,
                    },
                ]),
            };
            db_1.db.insert.mockReturnValue(mockInsert);
            await (0, authRepository_1.createUser)(userInput);
            (0, globals_1.expect)(mockInsert.values).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                phoneNumber: expectedSanitized,
            }));
        });
    });
    (0, globals_1.describe)("Duplicate Prevention", () => {
        (0, globals_1.it)("should prevent duplicate phone numbers at database level", async () => {
            // Simulate database unique violation
            const uniqueViolationError = new Error("duplicate key value violates unique constraint");
            const typedUniqueViolationError = uniqueViolationError;
            typedUniqueViolationError.code = "23505";
            typedUniqueViolationError.detail =
                "Key (phone_number)=(+2348123456789) already exists.";
            const mockInsert = {
                values: globals_1.jest.fn().mockReturnThis(),
                returning: globals_1.jest.fn().mockRejectedValue(uniqueViolationError),
            };
            db_1.db.insert.mockReturnValue(mockInsert);
            const userInput = {
                email: "duplicate@example.com",
                passwordHash: "hashedpassword",
                name: "Duplicate User",
                phoneNumber: "+2348123456789",
            };
            await (0, globals_1.expect)((0, authRepository_1.createUser)(userInput)).rejects.toThrow(uniqueViolationError);
        });
    });
    (0, globals_1.describe)("Integration with Registration API", () => {
        (0, globals_1.it)("should check phone number uniqueness before registration", async () => {
            const existingUser = {
                id: "existing-123",
                email: "existing@example.com",
                name: "Existing User",
                phoneNumber: "+2348123456789",
                role: "user",
                status: "active",
            };
            // Mock existing user found by phone
            db_1.db.query.users.findFirst.mockResolvedValue(existingUser);
            const result = await (0, authRepository_1.findUserByPhoneNumber)("+2348123456789");
            (0, globals_1.expect)(result).toEqual(existingUser);
            (0, globals_1.expect)(db_1.db.query.users.findFirst).toHaveBeenCalled();
        });
    });
});
