-- ============================================================
-- MIGRATION — Multi-sociétés par analyse + HTML content
-- Exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Changer content de JSONB vers TEXT (HTML brut)
ALTER TABLE investment_cases 
  ALTER COLUMN content TYPE TEXT USING content::text;

ALTER TABLE investment_cases 
  ALTER COLUMN content SET DEFAULT '';

-- 2. Table de jointure analyse <-> sociétés avec rating individuel
CREATE TABLE IF NOT EXISTS investment_case_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_case_id UUID NOT NULL REFERENCES investment_cases(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rating TEXT CHECK (rating IN ('BUY', 'HOLD', 'SELL', 'WATCH')),
  target_price TEXT,   -- ex: "$950"
  upside TEXT,         -- ex: "+34%"
  UNIQUE(investment_case_id, company_id)
);

-- 3. RLS pour la nouvelle table
ALTER TABLE investment_case_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read case_companies" ON investment_case_companies
  FOR SELECT USING (TRUE);

CREATE POLICY "Admin full access case_companies" ON investment_case_companies
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. Migrer les données existantes (company_id + rating → nouvelle table)
INSERT INTO investment_case_companies (investment_case_id, company_id, rating)
SELECT id, company_id, rating
FROM investment_cases
WHERE company_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. On garde company_id et rating sur investment_cases pour compatibilité
--    mais ils ne seront plus utilisés pour les nouvelles analyses
--    (on peut les supprimer plus tard)
