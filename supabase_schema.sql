-- ============================================================
-- INVESTMENT PLATFORM — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Sectors / Industries
CREATE TABLE sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#1a1a2e',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies (tickers)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
  exchange TEXT DEFAULT 'NASDAQ',
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investment Cases (articles)
CREATE TABLE investment_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
  content JSONB NOT NULL DEFAULT '{}',  -- TipTap JSON content
  excerpt TEXT,
  rating TEXT CHECK (rating IN ('BUY', 'HOLD', 'SELL', 'WATCH')),
  target_horizon TEXT,  -- e.g. "12-18 mois"
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags (cross-cutting: themes, macro, etc.)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

-- Many-to-many: articles <-> tags
CREATE TABLE investment_case_tags (
  investment_case_id UUID REFERENCES investment_cases(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (investment_case_id, tag_id)
);

-- Related articles (cross-links)
CREATE TABLE related_cases (
  investment_case_id UUID REFERENCES investment_cases(id) ON DELETE CASCADE,
  related_case_id UUID REFERENCES investment_cases(id) ON DELETE CASCADE,
  PRIMARY KEY (investment_case_id, related_case_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_case_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE related_cases ENABLE ROW LEVEL SECURITY;

-- Public can read published cases only
CREATE POLICY "Public read published cases" ON investment_cases
  FOR SELECT USING (published = TRUE);

-- Public can read all sectors, companies, tags
CREATE POLICY "Public read sectors" ON sectors FOR SELECT USING (TRUE);
CREATE POLICY "Public read companies" ON companies FOR SELECT USING (TRUE);
CREATE POLICY "Public read tags" ON tags FOR SELECT USING (TRUE);
CREATE POLICY "Public read case_tags" ON investment_case_tags FOR SELECT USING (TRUE);
CREATE POLICY "Public read related_cases" ON related_cases FOR SELECT USING (TRUE);

-- Authenticated (admin) can do everything
CREATE POLICY "Admin full access cases" ON investment_cases
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access sectors" ON sectors
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access companies" ON companies
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access tags" ON tags
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access case_tags" ON investment_case_tags
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access related_cases" ON related_cases
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- Seed Data — Sectors
-- ============================================================

INSERT INTO sectors (slug, name, description, color) VALUES
  ('technology', 'Technology', 'Software, semiconductors, hardware & cloud infrastructure', '#0066FF'),
  ('financials', 'Financials', 'Banks, asset managers, insurance & fintech', '#00A86B'),
  ('healthcare', 'Healthcare', 'Biopharma, medtech, managed care & tools', '#E63946'),
  ('consumer', 'Consumer', 'Discretionary & staples — retail, brands, e-commerce', '#FF6B35'),
  ('industrials', 'Industrials', 'Aerospace, defense, automation & logistics', '#6B4FBB'),
  ('energy', 'Energy', 'Oil & gas, renewables & utilities', '#C77DFF');
