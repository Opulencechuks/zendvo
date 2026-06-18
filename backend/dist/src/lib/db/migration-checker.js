"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMigrationStatus = checkMigrationStatus;
exports.runMigrations = runMigrations;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const migrator_1 = require("drizzle-orm/node-postgres/migrator");
const pg_1 = require("pg");
const fs_1 = require("fs");
const path_1 = require("path");
async function checkMigrationStatus() {
    const databaseUrl = process.env.DATABASE_URL ||
        "postgres://postgres:postgres@localhost:5432/zendvo";
    let pool = null;
    try {
        const journalPath = (0, path_1.join)(process.cwd(), "drizzle", "meta", "_journal.json");
        const journalContent = (0, fs_1.readFileSync)(journalPath, "utf-8");
        const journal = JSON.parse(journalContent);
        const localMigrationCount = journal.entries.length;
        pool = new pg_1.Pool({ connectionString: databaseUrl });
        const db = (0, node_postgres_1.drizzle)(pool);
        const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'drizzle'
        AND table_name = '__drizzle_migrations'
      );
    `);
        const migrationsTableExists = tableCheckResult.rows[0].exists;
        if (!migrationsTableExists) {
            return {
                inSync: false,
                message: `⚠️  Migration table does not exist. Database needs initialization. Expected ${localMigrationCount} migration(s).`,
                localMigrations: localMigrationCount,
                appliedMigrations: 0,
            };
        }
        const appliedMigrationsResult = await pool.query(`
      SELECT COUNT(*) as count FROM drizzle.__drizzle_migrations;
    `);
        const appliedMigrationCount = parseInt(appliedMigrationsResult.rows[0].count, 10);
        if (appliedMigrationCount < localMigrationCount) {
            return {
                inSync: false,
                message: `⚠️  Database schema is OUT OF SYNC! Applied: ${appliedMigrationCount}, Local: ${localMigrationCount}. Run migrations before starting.`,
                localMigrations: localMigrationCount,
                appliedMigrations: appliedMigrationCount,
            };
        }
        if (appliedMigrationCount > localMigrationCount) {
            return {
                inSync: false,
                message: `⚠️  Database has MORE migrations than local files! Applied: ${appliedMigrationCount}, Local: ${localMigrationCount}. Pull latest code.`,
                localMigrations: localMigrationCount,
                appliedMigrations: appliedMigrationCount,
            };
        }
        return {
            inSync: true,
            message: `✅ Database schema is in sync. ${appliedMigrationCount} migration(s) applied.`,
            localMigrations: localMigrationCount,
            appliedMigrations: appliedMigrationCount,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return {
            inSync: false,
            message: `❌ Migration check failed: ${errorMessage}`,
            localMigrations: 0,
            appliedMigrations: 0,
        };
    }
    finally {
        if (pool) {
            await pool.end();
        }
    }
}
async function runMigrations() {
    const databaseUrl = process.env.DATABASE_URL ||
        "postgres://postgres:postgres@localhost:5432/zendvo";
    const pool = new pg_1.Pool({ connectionString: databaseUrl });
    try {
        const db = (0, node_postgres_1.drizzle)(pool);
        await (0, migrator_1.migrate)(db, { migrationsFolder: "./drizzle" });
        console.log("✅ Migrations completed successfully");
    }
    catch (error) {
        console.error("❌ Migration failed:", error);
        throw error;
    }
    finally {
        await pool.end();
    }
}
