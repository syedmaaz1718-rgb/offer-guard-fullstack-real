# API examples

See server/inference.mjs for strict fields. POST /api/analyze with JSON {"text":"job posting at least40 chars", "save":true}. Response {output,saved}, saved:null when save is not true. GET /api/history returns {items:[{id,created_at,summary}]}. DELETE /api/history/:id or DELETE /api/history uses JSON Content-Type and session cookie. No client-supplied model score can be saved. All persistence scoped to signed session. No raw document text returned in stored summaries.
