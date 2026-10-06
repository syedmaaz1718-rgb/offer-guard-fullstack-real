# Express + PostgreSQL deployment on Render

This is a full-stack app: the same Express server serves the Vite frontend, computes model outputs and stores opt-in summary history in PostgreSQL. No Python service/retraining needed for deployment. Source includes SQL schema, CRUD repository, API validation, session isolation and HTTP/SQL integration tests.

## Free-hosting facts checked October 6, 2026

- Render free web services sleep after15 minutes idle; waking takes about1 minute. 750 free service-hours/month are SHARED by the workspace. Two continuously running services could exceed that allowance; sleeping idle apps use fewer hours. No promise of always-on hosting.
- Local files, including SQLite, disappear on restart/redeploy/sleep. Free services cannot attach persistent disks. Therefore production REQUIRES external DATABASE_URL.
- Render's own free PostgreSQL expires after30 days. For a continuing free portfolio demo, this guide uses a separate Neon Free PostgreSQL project. Review current dashboard limits: official Neon page currently lists0.5GB/project and100 CU-hours/month/project. These are limits, not unlimited service guarantees. Do not select paid upgrades unless you intend to pay.

Sources: https://render.com/docs/free ; https://render.com/docs/deploy-node-express-app ; https://neon.com/faqs/simplest-postgres-setup-for-startups ; https://neon.com/docs/connect/choose-connection

## 1. Create a persistent database

1. Use the sign-up link on Neon's official site: https://neon.com/faqs/simplest-postgres-setup-for-startups . Create a Free project for THIS app. Use a separate project/database for the other app.
2. Choose a suitable region and open Connect. Select PostgreSQL/pg and copy the pooled connection string, with its supplied SSL settings (`sslmode=require` etc). Do not hand-build the URL, remove TLS options or paste it in chat/GitHub.
3. Keep the string private for Render's DATABASE_URL. It includes a database password. If exposed, rotate credentials immediately.

Any existing standard PostgreSQL works instead. Use a dedicated database/user, not a privileged database from another application. The app creates its single analyses table/index on startup. No SQL console step required.

## 2. Deploy the FULL SOURCE

1. Extract ZIP. Upload the project's CONTENTS to a GitHub repo root, including server/,src/,models/,package.json,package-lock.json. Do NOT upload node_modules,.env,.local-db or the large raw training CSV. dist is included, but Render rebuilds it.
2. In Render dashboard, New / Web Service. Connect GitHub repo. Choose Node runtime and a Free instance. Render may require account/billing verification; review what the dashboard shows and stop before an unwanted paid commitment.
3. Build command: `npm ci && npm run build`
4. Start command: `npm start`
5. Health check path: `/api/health`
6. Environment variables:
   - `NODE_VERSION` = `22.23.3`
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = Neon connection string (private)
   - `SESSION_SECRET` = a private random64-hex-character value. Generate locally: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
7. Deploy. Express binds Render's PORT automatically. Open returned onrender.com URL. Backend panel should show Connected. Compare a sample, tick Save result summary, run analysis, reload and check history. Delete it afterwards.
8. Use separate DB and SESSION_SECRET for the other app. render.yaml provides equivalent configuration, but manual steps make the secrets/plan choices explicit.

No Netlify frontend needed for this route. Frontend and API are same-origin, avoiding CORS/separate URL confusion. A dist-only static upload keeps explicit browser-mode analysis, but cannot save history or provide the Express API.

## Local (works without any cloud account)

Node22.23.3+:

```
npm ci
npm test
npm run build
npm start
```

Open http://localhost:3000. With no DATABASE_URL, local mode runs a real embedded PostgreSQL engine (PGlite) in `.local-db/`, not an in-memory mock or JSON-file database. SQL repository/schema are shared with cloud PostgreSQL. Production refuses this local fallback because Render files are ephemeral.

Optional: copy .env.example to .env. Set SESSION_SECRET privately to preserve access to old browser-session history across local restarts; without it a new local secret is generated each run. With DATABASE_URL it uses pg against your external PostgreSQL instead. Keep .env ignored.

For source hot reload, run `npm start` and `npm run dev` in separate terminals. Vite proxies /api to localhost3000. Use the built Express version for deployment/QA.

## API

- GET /api/health: database readiness, server inference.
- POST /api/analyze: validated texts plus optional save:true. Output calculated SERVER-SIDE; stored summary never trusted from client. Unsaved inference does not write rows.
- GET /api/history: latest100 unexpired summaries for this browser session.
- DELETE /api/history/:id: only this session's row.
- DELETE /api/history: this session's summaries only.

Request/response examples in API.md.

## Privacy/security boundaries

Inputs are transmitted to the server in server mode and handled transiently. The app does NOT persist/log raw texts. Explicit Save stores scores, detected skills/model terms and timestamps, which may still be sensitive. Do not put sensitive resumes or personal/employer records in this public portfolio demo.

History is isolated by a random, signed HttpOnly/SameSite=Strict cookie; Secure in production. Database stores a keyed session hash, never the raw cookie. There is NO account login, email recovery, shared history or cross-device sync. Clearing cookies loses history access; rotating SESSION_SECRET invalidates sessions. Do not describe this as production authentication.

SQL is parameterized. Length/type validation,64KB body limit, Helmet headers, same-origin mutation checks,60 requests/minute/IP limit, client timeout and sanitized5xx errors. Per-IP limits are not a total budget cap or full abuse protection. App does not log request bodies or stack traces; hosting network/access logs still exist.

Each session can save up to100 rows (best-effort concurrency limit). History older than30 days is hidden; expired rows are purged on the next successful save, not by a background scheduler. Use Delete to remove sooner. Backups/provider retention are separate. Do not claim immediate erasure from provider backups.

**Test boundary:** tests run real PostgreSQL SQL locally through PGlite, and real HTTP/Chromium workflows. External pg/Neon credentials and a Render production deploy have NOT been tested. Deployment/DB connectivity must be confirmed after you configure secrets; no fake successful deployment claim.
