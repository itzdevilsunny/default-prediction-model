-- ============================================================
-- Default Prediction Model — Supabase Database Schema
-- Run this in Supabase: Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. Loans Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id                        TEXT PRIMARY KEY,
  borrower_name             TEXT NOT NULL,
  loan_type                 TEXT NOT NULL CHECK (loan_type IN ('SME', 'Mortgage', 'Business', 'Personal')),
  borrower_segment          TEXT NOT NULL CHECK (borrower_segment IN ('SME', 'Retail', 'Corporate', 'HNW')),
  amount                    NUMERIC(15, 2) NOT NULL,
  interest_rate             NUMERIC(5, 2) NOT NULL,
  term_months               INTEGER NOT NULL,
  start_date                TEXT NOT NULL,
  fico_score                INTEGER NOT NULL,
  dti                       NUMERIC(5, 2) NOT NULL,
  missed_payments_12m       INTEGER NOT NULL DEFAULT 0,
  ltv                       NUMERIC(5, 2),
  officer_notes_sentiment   TEXT NOT NULL CHECK (officer_notes_sentiment IN ('Positive', 'Negative', 'Neutral')),
  officer_notes_summary     TEXT NOT NULL,
  sector_news_sentiment     TEXT NOT NULL CHECK (sector_news_sentiment IN ('Positive', 'Negative', 'Neutral')),
  sector_news_summary       TEXT NOT NULL,
  communication_sentiment   TEXT NOT NULL CHECK (communication_sentiment IN ('Positive', 'Negative', 'Neutral')),
  default_probability_12m   NUMERIC(5, 4) NOT NULL,
  risk_tier                 TEXT NOT NULL CHECK (risk_tier IN ('Low', 'Medium', 'High')),
  last_updated              TEXT NOT NULL,
  ai_risk_summary           TEXT NOT NULL,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Audit Logs Table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id         TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  analyst_name    TEXT NOT NULL,
  risk_override   TEXT NOT NULL CHECK (risk_override IN ('Low', 'Medium', 'High')),
  notes           TEXT NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('approve', 'escalate', 'review')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Row Level Security (RLS) — Allow all for demo ────────────────────────
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon/publishable key full read access to loans
CREATE POLICY "Allow public read loans"
  ON loans FOR SELECT
  TO anon
  USING (true);

-- Allow anon key to update risk_tier (underwriter override from frontend)
CREATE POLICY "Allow public update risk_tier"
  ON loans FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon key full read access to audit logs
CREATE POLICY "Allow public read audit_logs"
  ON audit_logs FOR SELECT
  TO anon
  USING (true);

-- Allow anon key to insert audit logs
CREATE POLICY "Allow public insert audit_logs"
  ON audit_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- ─── 4. Indexes for performance ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_loans_risk_tier ON loans (risk_tier);
CREATE INDEX IF NOT EXISTS idx_loans_loan_type ON loans (loan_type);
CREATE INDEX IF NOT EXISTS idx_loans_default_probability ON loans (default_probability_12m DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_loan_id ON audit_logs (loan_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- ─── 5. Seed Data — 10 Loan Portfolio ────────────────────────────────────────
INSERT INTO loans (id, borrower_name, loan_type, borrower_segment, amount, interest_rate, term_months, start_date, fico_score, dti, missed_payments_12m, ltv, officer_notes_sentiment, officer_notes_summary, sector_news_sentiment, sector_news_summary, communication_sentiment, default_probability_12m, risk_tier, last_updated, ai_risk_summary)
VALUES
  (
    'LN-2026-041', 'Zeta Manufacturing LLC', 'SME', 'SME', 650000, 8.5, 60, '2024-03-15',
    590, 48.5, 3, NULL,
    'Negative', 'Borrower missed meetings. Declining operating cash flow. Inventory turnover slowed 40%. Partnership disputes.',
    'Negative', 'Industrial supply chains face 15% tariff increases; manufacturing sector contracts third consecutive quarter.',
    'Negative', 0.912, 'High', '2026-07-01',
    'High default risk driven by acute operating cash flow compression, supply chain headwinds, and high debt service.'
  ),
  (
    'LN-2026-078', 'Sarah Jenkins', 'Mortgage', 'Retail', 420000, 6.2, 360, '2022-11-10',
    785, 28.0, 0, 72.0,
    'Positive', 'Excellent communication. Stable employment as senior software engineer at Tier 1 tech firm.',
    'Positive', 'Local real estate market shows steady 4.5% annual appreciation.',
    'Positive', 0.018, 'Low', '2026-07-02',
    'Extremely low credit risk. Strong repayment history and highly stable primary income source.'
  ),
  (
    'LN-2026-102', 'Apex Tech Solutions Inc.', 'Business', 'Corporate', 1200000, 7.8, 48, '2025-01-05',
    680, 44.2, 1, NULL,
    'Neutral', 'Revenue grew 15% y-o-y, but margin compressed from 18% to 12%. Series B expected in 90 days.',
    'Positive', 'Enterprise SaaS sector spending projects 18% growth over next 12 months.',
    'Positive', 0.425, 'Medium', '2026-06-28',
    'Moderate risk. High leverage balanced by growing customer base and strong sector tailwinds.'
  ),
  (
    'LN-2026-119', 'Marcus Vance', 'Personal', 'Retail', 35000, 14.5, 36, '2025-06-20',
    605, 52.0, 2, NULL,
    'Negative', 'Temporary job loss followed by contract work. Credit card utilization increased from 35% to 88% in 6 months.',
    'Neutral', 'Retail sales index flat. Gig economy employment index shows 4% growth.',
    'Negative', 0.741, 'High', '2026-07-02',
    'High default risk driven by high debt utilization and employment transition.'
  ),
  (
    'LN-2026-003', 'Global Logistics Corp', 'Business', 'Corporate', 1500000, 6.9, 120, '2021-05-10',
    740, 31.5, 0, NULL,
    'Positive', 'Solid balance sheet. 2.1x current ratio. Successfully renewed long-term contracts.',
    'Neutral', 'Global freight index fluctuates within normal bounds.',
    'Positive', 0.068, 'Low', '2026-06-30',
    'Very low risk. Strong corporate liquidity and locked-in contract revenues.'
  ),
  (
    'LN-2026-204', 'Green Horizon Agriculture', 'SME', 'SME', 450000, 8.9, 72, '2023-10-12',
    630, 47.0, 2, NULL,
    'Negative', 'Crop yields fell 25% below forecast. Insurance payout covers only half of operating losses.',
    'Negative', 'Extreme weather patterns trigger agricultural yield warnings.',
    'Neutral', 0.814, 'High', '2026-07-01',
    'High default risk. Crop losses drained cash reserves amid adverse weather forecasts.'
  ),
  (
    'LN-2026-056', 'Dr. Arthur Pendelton', 'Personal', 'HNW', 150000, 7.2, 60, '2025-02-18',
    760, 22.5, 0, NULL,
    'Positive', 'Lead surgeon at County General. Stable, high salary. Excellent debt management.',
    'Positive', 'Medical services sector showing strong pricing power.',
    'Positive', 0.024, 'Low', '2026-06-25',
    'Minimal risk. High, stable, non-cyclical professional income with low debt load.'
  ),
  (
    'LN-2026-099', 'Nova Restaurant Group', 'SME', 'SME', 320000, 9.4, 48, '2024-07-22',
    660, 41.0, 1, NULL,
    'Neutral', '3rd location delayed by permitting issues, creating 3-month cash flow lag.',
    'Negative', 'Hospitality sector reports 8% increase in labor costs.',
    'Positive', 0.380, 'Medium', '2026-07-02',
    'Moderate risk. Expansion friction caused temporary cash depletion, but core operations viable.'
  ),
  (
    'LN-2026-112', 'Elite Freight Logistics', 'SME', 'SME', 280000, 8.2, 36, '2025-09-01',
    620, 49.0, 2, NULL,
    'Negative', 'Major corporate client representing 35% of revenue announced contract termination.',
    'Neutral', 'Regional trucking volume steady, but fleet insurance rates increased 12%.',
    'Neutral', 0.785, 'High', '2026-07-01',
    'High credit risk. Imminent 35% revenue drop will severely stress cash flows.'
  ),
  (
    'LN-2026-150', 'Diana Prince', 'Mortgage', 'HNW', 850000, 5.8, 360, '2023-08-01',
    710, 36.5, 0, 65.0,
    'Neutral', 'Income from real estate commissions and dividends. Seasonal variance but high net worth.',
    'Neutral', 'Luxury residential market volume decreased 8%, median prices resilient.',
    'Positive', 0.152, 'Low', '2026-07-02',
    'Low credit risk. Variable income fully backed by conservative LTV ratio and liquid assets.'
  )
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT 'Loans table seeded with ' || COUNT(*) || ' records.' AS status FROM loans;
SELECT 'Audit logs table ready: ' || COUNT(*) || ' entries.' AS status FROM audit_logs;
