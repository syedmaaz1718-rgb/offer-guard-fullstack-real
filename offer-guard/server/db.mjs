import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
export async function connectDatabase() {
  const db = process.env.DATABASE_URL
    ? new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        connectionTimeoutMillis: 10000,
      })
    : new PGlite(process.env.LOCAL_DB_PATH || "./.local-db");
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL)
    throw new Error(
      "Production requires persistent external PostgreSQL DATABASE_URL. Local embedded DB is not persistent on Render.",
    );
  const sql = await import("node:fs/promises");
  const schema = await sql.readFile(
    new URL("./schema.sql", import.meta.url),
    "utf8",
  );
  if (db.exec) await db.exec(schema);
  else await db.query(schema);
  return db;
}
export function repository(db) {
  return {
    async list(session) {
      return (
        await db.query(
          "SELECT id,created_at,summary FROM analyses WHERE session_hash=$1 AND created_at > NOW() - INTERVAL '30 days' ORDER BY created_at DESC LIMIT 100",
          [session],
        )
      ).rows;
    },
    async save(session, summary) {
      await db.query(
        "DELETE FROM analyses WHERE created_at < NOW() - INTERVAL '30 days'",
      );
      const count = (
        await db.query(
          "SELECT count(*) AS n FROM analyses WHERE session_hash=$1",
          [session],
        )
      ).rows[0].n;
      if (Number(count) >= 100)
        throw Object.assign(
          new Error("History limit reached. Delete old summaries first."),
          { status: 409 },
        );
      return (
        await db.query(
          "INSERT INTO analyses(session_hash,summary) VALUES($1,$2::jsonb) RETURNING id,created_at,summary",
          [session, JSON.stringify(summary)],
        )
      ).rows[0];
    },
    async remove(session, id) {
      return (
        (
          await db.query(
            "DELETE FROM analyses WHERE id=$1 AND session_hash=$2 RETURNING id",
            [id, session],
          )
        ).rows.length > 0
      );
    },
    async clear(session) {
      await db.query("DELETE FROM analyses WHERE session_hash=$1", [session]);
    },
    async ping() {
      await db.query("SELECT 1");
    },
  };
}
