import { randomBytes } from "node:crypto";
import { connectDatabase, repository } from "./db.mjs";
import { createApp } from "./app.mjs";
import { infer } from "./inference.mjs";
const production = process.env.NODE_ENV === "production";
if (production && !process.env.SESSION_SECRET)
  throw new Error("Set a private SESSION_SECRET in hosting settings.");
const secret = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
if (!process.env.SESSION_SECRET)
  console.log(
    "Local session secret generated for this run. Set SESSION_SECRET to keep history access across restarts.",
  );
const db = await connectDatabase();
const app = createApp({ repo: repository(db), infer, secret, production });
const server = app.listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
  console.log("ML server listening on port " + (process.env.PORT || 3000)),
);
for (const sig of ["SIGINT", "SIGTERM"])
  process.on(sig, () =>
    server.close(async () => {
      if (db.end) await db.end();
      else await db.close();
      process.exit(0);
    }),
  );
