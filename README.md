[README.md](https://github.com/user-attachments/files/33108672/README.md)
# OfferGuard

Explainable NLP screening for suspicious job and internship language.

**A working ML/data-science portfolio project, not a production decision system.**

## What it does

Inspect lower/elevated/mixed scam-language signals, red-flag highlights, feature evidence and JSON exports. Never verifies a company or establishes legitimacy.

## Model and evidence

- **Method:** TF-IDF (unigrams + bigrams) with English stop-word removal, log-scaled term counts and L2 normalization, then logistic regression.
- **Training data:** EMSCAD, 17,880 real manually labeled ads from 2012–2014. After normalized exact-text deduplication: 15,804 usable rows, 12,643 training / 3,161 test.
- **Evaluation:** Real-data held-out accuracy 97.98%; AUROC 0.9769; fraud precision 75.00%, recall 82.39%, F1 0.7852. Majority baseline 95.51%. This is a historical stratified random holdout, not current India-specific scam accuracy. Near-duplicates/employer overlap can remain.
- **Pipeline:** Job post → Python-trained frozen vectorizer → normalized features → logistic score → signed log-odds contributions. Rule-based highlights run separately.

## Portfolio talking points

Explain the feature pipeline, data provenance, holdout design, cross-language model export, and why the output is limited. Explain why high overall accuracy is insufficient on a corpus with only about 5% fraud. Do not claim current real-world or India-specific validation.

## Limitations and next steps

Already trained on real EMSCAD posts. Next: temporal and employer-disjoint evaluation, independently labeled contemporary Indian posts, company/domain verification, adversarial/negated-language tests and representative calibration.

Read [`models/MODEL_CARD.md`](models/MODEL_CARD.md) before interpreting outputs.

## Full-stack local and Render deployment

**Express backend + real PostgreSQL database are now included.** Same-origin server inference, opt-in saved analysis summaries, per-browser signed-cookie isolation, refresh/delete history. Raw document text is never stored. Browser-only inference remains an explicit offline/static option.

```
npm ci
npm test
npm run build
npm start
```

Open http://localhost:3000. Local mode uses real embedded PostgreSQL (PGlite), persisted in .local-db. Render production uses external PostgreSQL via DATABASE_URL (Neon Free recommended over expiring Render Free DB). Model is pre-trained; no Python/API model account needed to run.

**Read [RENDER_SETUP.md](RENDER_SETUP.md) for exact free-tier caveats, private DB/SESSION_SECRET setup and deploy steps.** Render build `npm ci && npm run build`; start `npm start`; health check `/api/health`; NODE_VERSION=22.23.3. Deploy FULL SOURCE, not only dist. No cloud deployment was performed; local SQL/API/browser tests are not a claim of a live Render deployment.

Static fallback: you can still Drop dist on Netlify, but only explicitly selected browser inference works there. No backend or history exists on a dist-only static upload.

## Reproduce the model (optional)

Tested training environment: **Python 3.10**, NumPy 2.2.6, scikit-learn 1.7.2.

```bash
python3 -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell instead: .venv\Scripts\Activate.ps1
pip install -r training/requirements.txt
python training/train.py
npm test
npm run build
```

Training first downloads the public raw CSV and verifies its pinned SHA256. It requires internet and about 60 MB of disk. The raw CSV is not redistributed in this ZIP; see data/README.md for provenance/rights caveats. Training overwrites `models/model.json` and cross-language test fixtures. Fixed seed 42 makes the experiment reproducible within the pinned environment. Models are JSON, not pickle, so deployment does not execute deserialized Python objects.

## Architecture

```
training/train.py  -> data + trained sklearn model -> models/model.json
models/model.json -> server/inference.mjs -> Express API -> src/main.js UI
server/db.mjs -> PostgreSQL analyses table (opt-in summaries only)
models/model.json -> src/ml.mjs (explicit static/browser fallback)
                     tests/model.test.mjs checks sklearn parity
```

- `src/main.js`: input validation, rendering and interactions.
- `src/ml.mjs`: shared inference/math functions used by server and browser fallback.
- `server/`: Express API, model inference, SQL schema and parameterized repository.
- `src/backend.mjs`: same-origin API calls and session history controls.
- `src/ui.mjs` / `src/style.css`: responsive interface and inline SVG charts.
- `models/`: frozen model artifacts and model card.
- `data/`: documented training data/corpus.
- `tests/`: Node unit tests and sklearn-generated golden outputs.
- `dist/`: prebuilt static deployment, included deliberately.
- `screenshots/`: desktop start/result screens and mobile result view.
- `.github/workflows/ci.yml`: build + test on push/PR.

## Screenshots

Actual UI screenshots, not mockups:

![Main screen](screenshots/main.png)
![Model output](screenshots/results.png)

Mobile screenshot: [mobile.png](screenshots/mobile.png).
After deploying, you can replace these with your own screenshots. Live demo URL: **add your Netlify URL here**.

## Verification

- `npm test`: numerical parity with Python/scikit-learn golden fixtures at 1e-10 tolerance, plus project-specific edge cases.
- `npm run build`: production bundle.
- Manual/automated Chromium checks: desktop 1440px, phone 390px, form validation, sample-to-result flows, JSON download and no uncaught browser errors.
- Outputs are computed from committed model weights; no fabricated API responses or random UI scores.

## Privacy and security

Server mode sends input to the backend. Saving is explicit and stores only result summaries (which may include sensitive skills/terms), not raw input text. Signed HttpOnly browser-session cookie is not a login/account; no cross-device recovery. Cookie clearing loses access. SQL is parameterized, mutations require JSON/same-origin, limits/headers enabled. See RENDER_SETUP.md for retention/abuse/hosting-log caveats. Avoid sensitive personal records in a public demo.

## Stack and design

Python + scikit-learn for model fitting; framework-free JavaScript ES modules, Vite 8 and CSS for inference/UI. No remote fonts. Express, pg, PGlite, Helmet and rate limiting are server dependencies. Server inference and SQL history are inspectable; browser-only mode stays local. Near-black grid backgrounds, accent glows, bold Space Grotesk headings, Inter body text, gradient actions and responsive result panels make the interface cinematic. Both font files are bundled locally with their OFL licenses; no remote font requests. Motion respects prefers-reduced-motion.

## License

Application code: MIT. Third-party datasets keep their original terms; see `data/README.md`. Do not claim model validation outside the stated dataset or population.
