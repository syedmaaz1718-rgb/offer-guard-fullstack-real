CREATE TABLE IF NOT EXISTS analyses (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 session_hash TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 summary JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS analyses_session_time ON analyses(session_hash,created_at DESC);
