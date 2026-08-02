import "dotenv/config";
import pg from "pg";

const { Client } = pg;
const url = process.env.DATABASE_URL.replace(/sslmode=require&channel_binding=require/, "sslmode=require");
const c = new Client({ connectionString: url });
await c.connect();
const tables = ["User", "Resume", "ParsedResume", "Analysis", "GeneratedResume", "CoverLetter", "JobDescription"];
for (const t of tables) {
  const r = await c.query('SELECT count(*)::int AS n FROM "' + t + '"');
  console.log(`${t}: ${r.rows[0].n}`);
}
await c.end();
