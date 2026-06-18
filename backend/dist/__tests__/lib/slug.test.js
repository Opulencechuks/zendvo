"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Define the mock variable at the very top with var so it's hoisted
var mockGenerate = jest.fn(() => "default_slug");
var mockCustomAlphabet = jest.fn(() => mockGenerate);
const slug_1 = require("../../src/lib/slug");
const db_1 = require("../../src/lib/db");
// Mock the database
jest.mock("../../src/lib/db", () => ({
    db: {
        query: {
            gifts: {
                findFirst: jest.fn(),
            },
        },
    },
}));
// Mock nanoid
jest.mock("nanoid", () => ({
    customAlphabet: mockCustomAlphabet,
}));
describe("generateUniqueSlug", () => {
    const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    beforeEach(() => {
        mockGenerate.mockClear();
        db_1.db.query.gifts.findFirst.mockClear();
    });
    test("should have initialized customAlphabet with correct parameters", () => {
        const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        expect(mockCustomAlphabet).toHaveBeenCalledWith(ALPHABET, 6);
    });
    describe("Success Scenarios", () => {
        test("should return a unique slug on the first attempt", async () => {
            // Mock db.query.gifts.findFirst to return null (no collision)
            db_1.db.query.gifts.findFirst.mockResolvedValue(null);
            // Mock mockGenerate to return a specific slug
            mockGenerate.mockReturnValue("unique123");
            const slug = await (0, slug_1.generateUniqueSlug)();
            expect(slug).toBe("unique123");
            expect(db_1.db.query.gifts.findFirst).toHaveBeenCalledTimes(1);
        });
        test("should retry and return a unique slug if a collision occurs", async () => {
            // First call returns a gift (collision), second call returns null (unique)
            db_1.db.query.gifts.findFirst
                .mockResolvedValueOnce({ id: "existing-id" })
                .mockResolvedValueOnce(null);
            mockGenerate
                .mockReturnValueOnce("collision1")
                .mockReturnValueOnce("uniqueAfterCol");
            const slug = await (0, slug_1.generateUniqueSlug)();
            expect(slug).toBe("uniqueAfterCol");
            expect(db_1.db.query.gifts.findFirst).toHaveBeenCalledTimes(2);
        });
        test("should succeed after multiple collisions (within limit)", async () => {
            // 4 collisions, then success
            db_1.db.query.gifts.findFirst
                .mockResolvedValueOnce({ id: "c1" })
                .mockResolvedValueOnce({ id: "c2" })
                .mockResolvedValueOnce({ id: "c3" })
                .mockResolvedValueOnce({ id: "c4" })
                .mockResolvedValueOnce(null);
            mockGenerate
                .mockReturnValueOnce("s1")
                .mockReturnValueOnce("s2")
                .mockReturnValueOnce("s3")
                .mockReturnValueOnce("s4")
                .mockReturnValueOnce("s-final");
            const slug = await (0, slug_1.generateUniqueSlug)();
            expect(slug).toBe("s-final");
            expect(db_1.db.query.gifts.findFirst).toHaveBeenCalledTimes(5);
        });
    });
    describe("Error Scenarios", () => {
        test("should throw an error after maximum retries are reached", async () => {
            // Always return a gift (constant collision)
            db_1.db.query.gifts.findFirst.mockResolvedValue({ id: "always-exists" });
            mockGenerate.mockReturnValue("failure");
            await expect((0, slug_1.generateUniqueSlug)()).rejects.toThrow("Failed to generate unique slug after maximum retries");
            expect(db_1.db.query.gifts.findFirst).toHaveBeenCalledTimes(5);
        });
    });
    describe("Slug Format", () => {
        test("should generate a slug with exactly 6 characters", async () => {
            db_1.db.query.gifts.findFirst.mockResolvedValue(null);
            // Use a generator that returns a 6-char string
            mockGenerate.mockReturnValue("ABCDEF");
            const slug = await (0, slug_1.generateUniqueSlug)();
            expect(slug).toHaveLength(6);
        });
        test("should only contain characters from the defined alphabet", async () => {
            db_1.db.query.gifts.findFirst.mockResolvedValue(null);
            // We manually implement a simple version of customAlphabet logic for this test
            // to avoid using the real nanoid which causes ESM issues in Jest.
            const simpleCustomAlphabet = (alphabet, size) => {
                return () => {
                    let result = "";
                    for (let i = 0; i < size; i++) {
                        result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
                    }
                    return result;
                };
            };
            mockGenerate.mockImplementation(simpleCustomAlphabet(ALPHABET, 6));
            const slug = await (0, slug_1.generateUniqueSlug)();
            const alphabetChars = ALPHABET.split("");
            for (const char of slug) {
                expect(alphabetChars).toContain(char);
            }
        });
    });
});
