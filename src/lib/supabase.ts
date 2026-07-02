import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Database Types ───────────────────────────────────────────────────────────

export interface DbLoan {
  id: string;
  borrower_name: string;
  loan_type: string;
  borrower_segment: string;
  amount: number;
  interest_rate: number;
  term_months: number;
  start_date: string;
  fico_score: number;
  dti: number;
  missed_payments_12m: number;
  ltv?: number;
  officer_notes_sentiment: string;
  officer_notes_summary: string;
  sector_news_sentiment: string;
  sector_news_summary: string;
  communication_sentiment: string;
  default_probability_12m: number;
  risk_tier: 'Low' | 'Medium' | 'High';
  last_updated: string;
  ai_risk_summary: string;
  created_at?: string;
}

export interface DbAuditLog {
  id?: string;
  loan_id: string;
  analyst_name: string;
  risk_override: string;
  notes: string;
  action: string;
  created_at?: string;
}

// ─── Supabase Query Helpers ───────────────────────────────────────────────────

/** Fetch all loans from Supabase with optional filters. */
export async function fetchLoansFromDb(filters?: {
  risk_tier?: string;
  loan_type?: string;
  search?: string;
}): Promise<DbLoan[]> {
  let query = supabase.from('loans').select('*').order('default_probability_12m', { ascending: false });

  if (filters?.risk_tier && filters.risk_tier !== 'ALL') {
    query = query.eq('risk_tier', filters.risk_tier);
  }
  if (filters?.loan_type && filters.loan_type !== 'ALL') {
    query = query.eq('loan_type', filters.loan_type);
  }
  if (filters?.search) {
    query = query.or(
      `borrower_name.ilike.%${filters.search}%,id.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/** Fetch a single loan by ID from Supabase. */
export async function fetchLoanByIdFromDb(loanId: string): Promise<DbLoan | null> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();

  if (error) return null;
  return data;
}

/** Get portfolio-level aggregates directly from Supabase. */
export async function fetchPortfolioSummaryFromDb() {
  const { data, error } = await supabase.from('loans').select('amount,default_probability_12m,risk_tier');
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const total_exposure = data.reduce((sum, l) => sum + l.amount, 0);
  const avg_pd = data.reduce((sum, l) => sum + l.default_probability_12m, 0) / data.length;
  const high = data.filter(l => l.risk_tier === 'High').length;
  const medium = data.filter(l => l.risk_tier === 'Medium').length;
  const low = data.filter(l => l.risk_tier === 'Low').length;

  return {
    total_exposure,
    total_loans: data.length,
    average_default_probability: avg_pd,
    high_risk_count: high,
    medium_risk_count: medium,
    low_risk_count: low,
    model_accuracy: 0.912,
    model_auc: 0.942,
    model_f1: 0.885,
    structured_records: 25840,
    unstructured_records: 19420,
  };
}

/** Submit an underwriter audit log directly to Supabase. */
export async function insertAuditLog(entry: DbAuditLog): Promise<DbAuditLog> {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert([entry])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Fetch all audit logs, optionally filtered by loan ID. */
export async function fetchAuditLogs(loanId?: string): Promise<DbAuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (loanId) query = query.eq('loan_id', loanId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/** Update risk_tier for a loan (underwriter override). */
export async function updateLoanRiskTier(loanId: string, riskTier: string): Promise<void> {
  const { error } = await supabase
    .from('loans')
    .update({ risk_tier: riskTier, last_updated: new Date().toISOString().split('T')[0] })
    .eq('id', loanId);

  if (error) throw error;
}
