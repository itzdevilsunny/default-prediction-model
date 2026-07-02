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

export interface ShapValue {
  feature: string;
  value: number; // positive means increases default risk, negative means decreases default risk
  displayValue: string;
}

export interface Loan {
  id: string;
  borrowerName: string;
  loanType: 'SME' | 'Mortgage' | 'Personal' | 'Business' | 'Auto';
  borrowerSegment: 'SME' | 'Retail' | 'Corporate' | 'HNW';
  amount: number;
  interestRate: number;
  termMonths: number;
  startDate: string;
  ficoScore: number;
  dti: number;
  missedPayments12M: number;
  ltv?: number;
  officerNotesSentiment: 'Positive' | 'Neutral' | 'Negative';
  officerNotesSummary: string;
  sectorNewsSentiment: 'Positive' | 'Neutral' | 'Negative';
  sectorNewsSummary: string;
  communicationSentiment: 'Positive' | 'Neutral' | 'Negative';
  defaultProbability12M: number;
  riskTier: 'Low' | 'Medium' | 'High';
  lastUpdated: string;
  aiRiskSummary: string;
  shapExplanations: ShapValue[];
  actualDefault?: number | null; // 0=Repaid, 1=Defaulted, null=Active
  
  // Decisioning & Pricing Engine
  decisionStatus: 'APPROVED' | 'REJECTED' | 'REFER';
  recommendedApr: number;
  recommendedLimit: number;
  baseRate: number;
  riskPremium: number;
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
  drift?: {
    psi: number;
    p_value: number;
    status: 'Low' | 'Moderate' | 'High';
    baseline: number[];
    active: number[];
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maps backend DbLoan schema to frontend Loan camelCase keys. */
export function mapDbLoanToLoan(dbLoan: any): Loan {
  if (!dbLoan) return dbLoan;
  
  const defaultProb = Number(dbLoan.default_probability_12m || 0.15);
  const fico = Number(dbLoan.fico_score || 700);
  const amount = Number(dbLoan.amount || 250000);
  const interestRate = Number(dbLoan.interest_rate || 7.0);

  // Compute local defaults if backend is still deploying
  const decisionStatus = dbLoan.decision_status || 
    (defaultProb >= 0.60 ? 'REJECTED' : defaultProb < 0.15 ? 'APPROVED' : 'REFER');
  
  const baseRate = dbLoan.base_rate !== undefined ? Number(dbLoan.base_rate) : interestRate;
  const riskPremium = dbLoan.risk_premium !== undefined ? Number(dbLoan.risk_premium) : roundToTwo(defaultProb * 12.0);
  const recommendedApr = dbLoan.recommended_apr !== undefined ? Number(dbLoan.recommended_apr) : roundToTwo(baseRate + riskPremium);
  
  const recommendedLimit = dbLoan.recommended_limit !== undefined ? Number(dbLoan.recommended_limit) : 
    (decisionStatus === 'REJECTED' ? 0.0 : roundToTwo(amount * (1.0 - defaultProb) * (fico / 850.0)));

  return {
    id: dbLoan.id,
    borrowerName: dbLoan.borrower_name,
    loanType: dbLoan.loan_type,
    borrowerSegment: dbLoan.borrower_segment,
    amount: amount,
    interestRate: interestRate,
    termMonths: Number(dbLoan.term_months),
    startDate: dbLoan.start_date,
    ficoScore: fico,
    dti: Number(dbLoan.dti),
    missedPayments12M: Number(dbLoan.missed_payments_12m),
    ltv: dbLoan.ltv !== null ? Number(dbLoan.ltv) : undefined,
    officerNotesSentiment: dbLoan.officer_notes_sentiment,
    officerNotesSummary: dbLoan.officer_notes_summary,
    sectorNewsSentiment: dbLoan.sector_news_sentiment,
    sectorNewsSummary: dbLoan.sector_news_summary,
    communicationSentiment: dbLoan.communication_sentiment,
    defaultProbability12M: defaultProb,
    riskTier: dbLoan.risk_tier,
    lastUpdated: dbLoan.last_updated,
    aiRiskSummary: dbLoan.ai_risk_summary,
    shapExplanations: dbLoan.shap_explanations || [],
    actualDefault: dbLoan.actual_default,
    
    // Injected Pricing Variables
    decisionStatus,
    recommendedApr,
    recommendedLimit,
    baseRate,
    riskPremium
  };
}

function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// ─── API Status Check ─────────────────────────────────────────────────────────

/** Check connectivity — tries Supabase first, then Render, then offline. */
export async function checkApiStatus(): Promise<ApiStatus> {
  try {
    await fetchPortfolioSummaryFromDb();
    return { online: true, url: 'Supabase', source: 'supabase' };
  } catch {
    // Supabase unavailable, try Render
  }

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
  try {
    const summary = await fetchPortfolioSummaryFromDb();
    if (summary) return summary as PortfolioSummary;
  } catch {
    // fall through
  }

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
  try {
    const dbLoans = await fetchLoansFromDb(params);
    const loans = dbLoans.map(mapDbLoanToLoan);
    return { loans, total: loans.length };
  } catch {
    // fall through to Render
  }

  const qs = new URLSearchParams();
  if (params?.risk_tier && params.risk_tier !== 'ALL') qs.set('risk_tier', params.risk_tier);
  if (params?.loan_type && params.loan_type !== 'ALL') qs.set('loan_type', params.loan_type);
  if (params?.search) qs.set('search', params.search);
  const path = `/api/loans${qs.toString() ? '?' + qs.toString() : ''}`;

  for (const base of [PRIMARY_API, FALLBACK_API]) {
    try {
      const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const data = await res.json();
        return {
          loans: (data.loans || []).map(mapDbLoanToLoan),
          total: data.total || 0,
        };
      }
    } catch { /* continue */ }
  }

  throw new Error('Loan data unavailable from all sources');
}

/** Get a single loan — Supabase first, Render fallback. */
export async function getLoan(loanId: string): Promise<Loan> {
  try {
    const loan = await fetchLoanByIdFromDb(loanId);
    if (loan) return mapDbLoanToLoan(loan);
  } catch {
    // fall through
  }

  for (const base of [PRIMARY_API, FALLBACK_API]) {
    try {
      const res = await fetch(`${base}/api/loans/${loanId}`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const dbLoan = await res.json();
        return mapDbLoanToLoan(dbLoan);
      }
    } catch { /* continue */ }
  }

  throw new Error(`Loan ${loanId} not found`);
}

/** Submit a new loan application. */
export async function submitNewApplication(loanData: any): Promise<Loan> {
  // Always submit through FastAPI backend since it runs the python ML model predictions
  for (const base of [PRIMARY_API, FALLBACK_API]) {
    try {
      // Map to snake_case for the FastAPI model
      const backendData = {
        borrower_name: loanData.borrowerName,
        loan_type: loanData.loanType,
        borrower_segment: loanData.borrowerSegment,
        amount: Number(loanData.amount),
        interest_rate: Number(loanData.interestRate),
        term_months: Number(loanData.termMonths),
        fico_score: Number(loanData.ficoScore),
        dti: Number(loanData.dti),
        missed_payments_12m: Number(loanData.missedPayments12M),
        ltv: loanData.ltv ? Number(loanData.ltv) : null,
        officer_notes_sentiment: loanData.officerNotesSentiment,
        officer_notes_summary: loanData.officerNotesSummary,
        sector_news_sentiment: loanData.sectorNewsSentiment,
        sector_news_summary: loanData.sectorNewsSummary,
        communication_sentiment: loanData.communicationSentiment
      };

      const res = await fetch(`${base}/api/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendData),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const createdDbLoan = await res.json();
        return mapDbLoanToLoan(createdDbLoan);
      }
    } catch (e) {
      console.warn(`[API] submitNewApplication failed on ${base}:`, e);
    }
  }
  throw new Error('New application ingestion failed on all backend API endpoints');
}

/** Submit audit override — writes to Supabase directly. */
export async function submitAudit(loanId: string, entry: AuditEntry) {
  try {
    await updateLoanRiskTier(loanId, entry.risk_override);
  } catch (e) {
    console.warn('Could not update risk tier in Supabase:', e);
  }

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
      message: `Audit logged for Loan ${loanId}. Risk overridden to {entry.risk_override}.`,
      timestamp: log.created_at,
    };
  } catch {
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

/** Submit loan actual outcome resolution (0=Repaid, 1=Defaulted). */
export async function submitLoanOutcome(loanId: string, actualDefault: number): Promise<boolean> {
  for (const base of [PRIMARY_API, FALLBACK_API]) {
    try {
      const res = await fetch(`${base}/api/loans/${loanId}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual_default: actualDefault }),
        signal: AbortSignal.timeout(15000)
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn(`[API] submitLoanOutcome failed on ${base}:`, e);
    }
  }
  return false;
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

/** Retrain model pipeline. */
export async function retrainModel(): Promise<boolean> {
  for (const base of [PRIMARY_API, FALLBACK_API]) {
    try {
      const res = await fetch(`${base}/api/model/train`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000) // 30s timeout for model training
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn(`[API] Model retraining failed on ${base}:`, e);
    }
  }
  return false;
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
