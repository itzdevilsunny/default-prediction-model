// API Service — Routes requests to Supabase (direct) or Render backend (fallback)
// Strategy: Frontend reads directly from Supabase for speed.
//           Audit submissions go through FastAPI backend for business logic.

import {
  fetchLoansFromDb,
  fetchLoanByIdFromDb,
  fetchPortfolioSummaryFromDb,
  insertAuditLog,
  fetchAuditLogs,
  updateLoanRiskTier,
} from '../lib/supabase';

const PRIMARY_API = import.meta.env.VITE_API_PRIMARY || 'https://default-prediction-model-1.onrender.com';
const FALLBACK_API = import.meta.env.VITE_API_FALLBACK || 'https://default-prediction-model.onrender.com';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Loan {
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
}

export interface PortfolioSummary {
  total_exposure: number;
  total_loans: number;
  average_default_probability: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  model_accuracy: number;
  model_auc: number;
  model_f1: number;
  structured_records: number;
  unstructured_records: number;
}

export interface ModelMetrics {
  accuracy: number;
  auc_roc: number;
  f1_score: number;
  precision: number;
  recall: number;
  accuracy_by_stage: Array<{ stage: string; accuracy: number }>;
  feature_importance: Array<{ feature: string; importance: number }>;
  confusion_matrix: {
    true_negative: number;
    false_positive: number;
    false_negative: number;
    true_positive: number;
  };
}

export interface AuditEntry {
  loan_id: string;
  analyst_name: string;
  risk_override: string;
  notes: string;
  action: string;
}

export interface ApiStatus {
  online: boolean;
  url: string | null;
  source: 'supabase' | 'render' | 'offline';
  error?: string;
}

// ─── API Status Check ─────────────────────────────────────────────────────────

/** Check connectivity — tries Supabase first, then Render, then offline. */
export async function checkApiStatus(): Promise<ApiStatus> {
  // 1. Try Supabase direct connection
  try {
    await fetchPortfolioSummaryFromDb();
    return { online: true, url: 'Supabase', source: 'supabase' };
  } catch {
    // Supabase unavailable, try Render
  }

  // 2. Try Render backend
  for (const base of [PRIMARY_API, FALLBACK_API]) {
    try {
      const res = await fetch(`${base}/`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return { online: true, url: base, source: 'render' };
    } catch {
      // try next
    }
  }

  return {
    online: false,
    url: null,
    source: 'offline',
    error: 'API is waking up or unavailable. Showing local data.',
  };
}

// ─── Portfolio Summary ────────────────────────────────────────────────────────

/** Gets portfolio summary — Supabase first, Render fallback. */
export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  // Try Supabase direct
  try {
    const summary = await fetchPortfolioSummaryFromDb();
    if (summary) return summary as PortfolioSummary;
  } catch {
    // fall through
  }

  // Try Render backend
  for (const base of [PRIMARY_API, FALLBACK_API]) {
    try {
      const res = await fetch(`${base}/api/portfolio/summary`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return res.json();
    } catch { /* continue */ }
  }

  throw new Error('Portfolio summary unavailable from all sources');
}

// ─── Loans ────────────────────────────────────────────────────────────────────

/** Get filtered list of loans — Supabase first, Render fallback. */
export async function getLoans(params?: {
  risk_tier?: string;
  loan_type?: string;
  search?: string;
}): Promise<{ loans: Loan[]; total: number }> {
  // Try Supabase direct
  try {
    const loans = await fetchLoansFromDb(params) as Loan[];
    return { loans, total: loans.length };
  } catch {
    // fall through to Render
  }

  // Try Render backend
  const qs = new URLSearchParams();
  if (params?.risk_tier && params.risk_tier !== 'ALL') qs.set('risk_tier', params.risk_tier);
  if (params?.loan_type && params.loan_type !== 'ALL') qs.set('loan_type', params.loan_type);
  if (params?.search) qs.set('search', params.search);
  const path = `/api/loans${qs.toString() ? '?' + qs.toString() : ''}`;

  for (const base of [PRIMARY_API, FALLBACK_API]) {
    try {
      const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return res.json();
    } catch { /* continue */ }
  }

  throw new Error('Loan data unavailable from all sources');
}

/** Get a single loan — Supabase first, Render fallback. */
export async function getLoan(loanId: string): Promise<Loan> {
  // Try Supabase direct
  try {
    const loan = await fetchLoanByIdFromDb(loanId) as Loan | null;
    if (loan) return loan;
  } catch {
    // fall through
  }

  // Try Render
  for (const base of [PRIMARY_API, FALLBACK_API]) {
    try {
      const res = await fetch(`${base}/api/loans/${loanId}`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return res.json();
    } catch { /* continue */ }
  }

  throw new Error(`Loan ${loanId} not found`);
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

/** Submit audit override — writes to Supabase directly. */
export async function submitAudit(loanId: string, entry: AuditEntry) {
  // 1. Update loan risk_tier in Supabase
  try {
    await updateLoanRiskTier(loanId, entry.risk_override);
  } catch (e) {
    console.warn('Could not update risk tier in Supabase:', e);
  }

  // 2. Insert audit log record in Supabase
  try {
    const log = await insertAuditLog({
      loan_id: entry.loan_id,
      analyst_name: entry.analyst_name,
      risk_override: entry.risk_override,
      notes: entry.notes,
      action: entry.action,
    });
    return {
      success: true,
      audit_id: log.id,
      message: `Audit logged for Loan ${loanId}. Risk overridden to ${entry.risk_override}.`,
      timestamp: log.created_at,
    };
  } catch {
    // Supabase failed, fall back to Render backend
    for (const base of [PRIMARY_API, FALLBACK_API]) {
      try {
        const res = await fetch(`${base}/api/loans/${loanId}/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) return res.json();
      } catch { /* continue */ }
    }
    throw new Error('Audit submission failed on all backends');
  }
}

/** Fetch all audit logs. */
export async function getAuditLogs(loanId?: string) {
  try {
    const logs = await fetchAuditLogs(loanId);
    return { audits: logs, total: logs.length };
  } catch {
    for (const base of [PRIMARY_API, FALLBACK_API]) {
      try {
        const path = loanId ? `/api/audits?loan_id=${loanId}` : '/api/audits';
        const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(15000) });
        if (res.ok) return res.json();
      } catch { /* continue */ }
    }
    return { audits: [], total: 0 };
  }
}

/** Get model metrics — from Render backend. */
export async function getModelMetrics(): Promise<ModelMetrics> {
  for (const base of [PRIMARY_API, FALLBACK_API]) {
    try {
      const res = await fetch(`${base}/api/model/metrics`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return res.json();
    } catch { /* continue */ }
  }
  throw new Error('Model metrics unavailable');
}
