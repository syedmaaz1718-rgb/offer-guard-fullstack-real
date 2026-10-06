import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createApp({
  repo,
  infer,
  secret,
  production = false,
  staticFiles = true,
}) {
  if (!secret || secret.length < 32)
    throw new Error("SESSION_SECRET must contain at least32 characters.");
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
        },
      },
    }),
  );
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 60,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use("/api", express.json({ limit: "64kb" }));
  const sign = (s) => createHmac("sha256", secret).update(s).digest("hex");
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD"].includes(req.method)) {
      if (
        !(req.get("content-type") || "")
          .toLowerCase()
          .startsWith("application/json")
      )
        return res.status(415).json({ error: "JSON required." });
      const origin = req.get("origin");
      if (origin && origin !== `${req.protocol}://${req.get("host")}`)
        return res.status(403).json({ error: "Cross-origin request denied." });
    }
    const cookie = (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("ml_session="))
      ?.slice(11);
    let token = cookie,
      valid = false;
    if (token && /^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)) {
      const [sid, sig] = token.split(".");
      valid = timingSafeEqual(Buffer.from(sig), Buffer.from(sign(sid)));
    }
    if (!valid) {
      const sid = randomBytes(32).toString("hex");
      token = sid + "." + sign(sid);
      res.cookie("ml_session", token, {
        httpOnly: true,
        secure: production,
        sameSite: "strict",
        maxAge: 30 * 86400000,
        path: "/",
      });
    }
    req.sessionHash = sign(token);
    next();
  });
  app.get("/api/health", async (req, res, next) => {
    try {
      await repo.ping();
      res.json({ status: "ok", database: "PostgreSQL", serverInference: true });
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/analyze", async (req, res, next) => {
    try {
      const output = infer(req.body);
      let saved = null;
      if (req.body.save === true)
        saved = await repo.save(req.sessionHash, output);
      res.json({ output, saved });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/history", async (req, res, next) => {
    try {
      res.json({ items: await repo.list(req.sessionHash) });
    } catch (e) {
      next(e);
    }
  });
  app.delete("/api/history/:id", async (req, res, next) => {
    try {
      if (!uuid.test(req.params.id))
        return res.status(400).json({ error: "Invalid history ID." });
      if (!(await repo.remove(req.sessionHash, req.params.id)))
        return res
          .status(404)
          .json({ error: "Summary not found in this session." });
      res.json({ deleted: true });
    } catch (e) {
      next(e);
    }
  });
  app.delete("/api/history", async (req, res, next) => {
    try {
      await repo.clear(req.sessionHash);
      res.json({ deleted: true });
    } catch (e) {
      next(e);
    }
  });
  if (staticFiles) {
    app.use(
      express.static(fileURLToPath(new URL("../dist/", import.meta.url))),
    );
    app.get("/", (req, res) =>
      res.sendFile(
        fileURLToPath(new URL("../dist/index.html", import.meta.url)),
      ),
    );
  }
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    res
      .status(status)
      .json({
        error:
          status >= 500
            ? "Server/database unavailable. Your analysis was not saved."
            : err.message,
      });
  });
  return app;
}
