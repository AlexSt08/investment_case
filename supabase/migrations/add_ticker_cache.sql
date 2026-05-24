-- ============================================================
-- MIGRATION — Ticker Cache
-- Supabase SQL Editor → Run this script
-- ============================================================

CREATE TABLE IF NOT EXISTS ticker_cache (
  ticker               TEXT PRIMARY KEY,
  company_name         TEXT NOT NULL,
  data                 JSONB NOT NULL,
  fetched_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_earnings_date   DATE,
  next_earnings_date   DATE,
  earnings_date_quality TEXT CHECK (earnings_date_quality IN ('confirmed', 'estimated', 'unknown'))
                         DEFAULT 'unknown',
  source               TEXT DEFAULT 'fmp'
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_ticker_cache_fetched ON ticker_cache (fetched_at);
CREATE INDEX IF NOT EXISTS idx_ticker_cache_next_earnings ON ticker_cache (next_earnings_date);

-- RLS
ALTER TABLE ticker_cache ENABLE ROW LEVEL SECURITY;

-- Public read (données financières publiques)
CREATE POLICY "Public read ticker_cache"
  ON ticker_cache FOR SELECT USING (TRUE);

-- Authenticated (server-side API route) can upsert
CREATE POLICY "Service role upsert ticker_cache"
  ON ticker_cache FOR ALL USING (auth.role() = 'authenticated');

-- ── Seed : univers de couverture pré-validé ───────────────────────────────
-- Ces entrées statiques seront ignorées si lib/ticker-data.ts répond en premier.
-- Elles servent de fallback si l'API route est appelée directement sans passer
-- par le layer statique.
