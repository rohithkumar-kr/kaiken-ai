import "dotenv/config";
import pg from "pg";

const { Client } = pg;
const url = process.env.DATABASE_URL.replace(/sslmode=require&channel_binding=require/, "sslmode=require");
const c = new Client({ connectionString: url });
await c.connect();

const rows = (await c.query('SELECT id, status, "atsScore", error, "createdAt", "processingTime" FROM "Analysis" ORDER BY "createdAt" DESC LIMIT 8')).rows;
console.log("=== ANALYSES ===");
for (const r of rows) console.log(JSON.stringify(r));

const gres = (await c.query('SELECT id, status, format, error, "createdAt" FROM "GeneratedResume" ORDER BY "createdAt" DESC LIMIT 8')).rows;
console.log("=== GENERATED RESUMES ===");
for (const r of gres) console.log(JSON.stringify(r));

const cl = (await c.query('SELECT id, status, error, "createdAt", left(content, 60) AS content_prefix FROM "CoverLetter" ORDER BY "createdAt" DESC LIMIT 5')).rows;
console.log("=== COVER LETTERS ===");
for (const r of cl) console.log(JSON.stringify(r));

const resume = (await c.query('SELECT id, "parseStatus", "parseError", "fileName", "createdAt" FROM "Resume" ORDER BY "createdAt" DESC LIMIT 5')).rows;
console.log("=== RESUMES ===");
for (const r of resume) console.log(JSON.stringify(r));

await c.end();
