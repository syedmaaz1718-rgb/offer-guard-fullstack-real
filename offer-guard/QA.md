# Verification record

- Tested with Node 22.23.3 and npm 10.9.9.
- Training Python 3.10 with dependencies pinned in training/requirements.txt.
- Production build passed.
- Unit tests passed, including numerical sklearn-to-JavaScript golden-fixture parity (tolerance 1e-10).
- Chromium desktop and phone interaction checks passed: sample flow, empty/invalid input where applicable, JSON download, no horizontal phone overflow and no uncaught page errors.
- Actual desktop and mobile screenshots inspected for typography, spacing and clipped content.

These checks verify implementation, not medical validity, fraud-detection accuracy in the wild, real traffic forecasting performance or hiring outcomes.

Dark UI revision: four distinct app-specific compositions, locally bundled OFL fonts, desktop and mobile screenshots re-inspected, browser workflows and all unit tests passed again. Model weights and numerical outputs unchanged.

## Real-data/full-stack revision
Model parity tests pass; real SQL via embedded PostgreSQL/PGlite integration exercises HTTP inference, opt-in insert, session isolation, CRUD, cross-origin rejection, validation, no raw text persistence and disk restart persistence. Chromium against actual Express server: analyze/save/reload/different-browser isolation/delete/mobile width390/no uncaught errors pass. Desktop/full-page and mobile-history pixels inspected. npm audit:0 known vulnerabilities at build time. Cloud pg/Neon and Render production deployment not tested without owner credentials.
