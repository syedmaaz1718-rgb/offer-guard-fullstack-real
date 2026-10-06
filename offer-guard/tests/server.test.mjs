import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { repository } from "../server/db.mjs";
import { createApp } from "../server/app.mjs";
import { infer } from "../server/inference.mjs";
const appName = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url)),
).name;
const fixture =
  appName === "offer-guard"
    ? {
        text: "Pay a registration fee and transfer money today. Guaranteed job without an interview.",
      }
    : {
        resume:
          "python sql pandas machine learning react git, experience developing and testing projects",
        job: "python sql docker aws statistics machine learning role, developing and testing pipelines",
      };
test("SQL + HTTP integration: inference, opt-in persistence, isolation, delete, validation and restart", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ml-postgres-"));
  let db = new PGlite(dir);
  await db.exec(
    fs.readFileSync(new URL("../server/schema.sql", import.meta.url), "utf8"),
  );
  const app = createApp({
    repo: repository(db),
    infer,
    secret: "x".repeat(64),
    staticFiles: false,
  });
  const server = await new Promise((r) => {
    const s = app.listen(0, "127.0.0.1", () => r(s));
  });
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    let res = await fetch(base + "/api/health");
    assert.equal(res.status, 200);
    const cookie = res.headers.get("set-cookie").split(";")[0];
    assert.ok(res.headers.get("set-cookie").includes("HttpOnly"));
    assert.ok(res.headers.get("set-cookie").includes("SameSite=Strict"));
    const request = (url, method = "GET", body, c = cookie, extra = {}) =>
      fetch(base + url, {
        method,
        headers: { Cookie: c, "Content-Type": "application/json", ...extra },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    res = await request("/api/analyze", "POST", fixture);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).saved, null);
    assert.equal(
      (await (await request("/api/history")).json()).items.length,
      0,
    );
    res = await request("/api/analyze", "POST", { ...fixture, save: true });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.saved.id);
    const rows = (await db.query("SELECT summary,session_hash FROM analyses"))
      .rows;
    assert.equal(rows.length, 1);
    assert.ok(!JSON.stringify(rows).includes(fixture.text || fixture.resume));
    assert.ok(!JSON.stringify(rows).includes("ml_session="));
    res = await fetch(base + "/api/history");
    const other = res.headers.get("set-cookie").split(";")[0];
    assert.equal((await res.json()).items.length, 0);
    assert.equal(
      (
        await request(
          "/api/history/" + data.saved.id,
          "DELETE",
          undefined,
          other,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await request(
          "/api/analyze",
          "POST",
          { ...fixture, save: true },
          cookie,
          { Origin: "https://evil.test" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request("/api/analyze", "POST", {
          text: "too short",
          resume: "short",
          job: "short",
        })
      ).status,
      400,
    );
    assert.equal(
      (await request("/api/history/" + "' OR 1=1 --", "DELETE")).status,
      400,
    );
    assert.equal(
      (await request("/api/history/" + data.saved.id, "DELETE")).status,
      200,
    );
    assert.equal(
      (await (await request("/api/history")).json()).items.length,
      0,
    );
    await request("/api/analyze", "POST", { ...fixture, save: true });
    await request("/api/history", "DELETE");
    assert.equal(
      (await (await request("/api/history")).json()).items.length,
      0,
    );
    await repository(db).save("restart-check", { model: "test", score: 0.5 });
    await db.close();
    db = new PGlite(dir);
    assert.equal((await repository(db).list("restart-check")).length, 1);
  } finally {
    await new Promise((r) => server.close(r));
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
