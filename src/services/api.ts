// API Service — connects the React frontend to the FastAPI backend on Render
// Primary URL: https://default-prediction-model-1.onrender.com
// Fallback:    https://default-prediction-model.onrender.com

const PRIMARY_API = 'https://default-prediction-model-1.onrender.com';
const FALLBACK_API = 'https://default-prediction-model.onrender.com';

// Try primary URL; on failure, fall back to secondary
async function fetchWithFallback(path: string, options?: RequestInit): Promise<Response> {
  const urls = [PRIMARY_API, FALLBACK_API];
  let lastError: Error | null = null;

  for (const base of urls) {
    try {
      const res = await fetch(`${base}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        },
        signal: AbortSignal.timeout(15000), // 15s timeout (Render cold start)
      });
      if (res.ok) return res;
    } catch (err) {
      lastError = err as Error;
    }
  }
  throw lastError || new Error('Both API endpoints unreachable');
}

// ─── Types (mirrors backend Pydantic models) ──────────────────────────────────

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
  error?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** Check if the API is reachable. */
export async function checkApiStatus(): Promise<ApiStatus> {
  for (const base of [PRIMARY_API, FALLBACK_API]) {
    try {
      const res = await fetch(`${base}/`, {
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) return { online: true, url: base };
    } catch {
      // try next
    }
  }
  return { online: false, url: null, error: 'API is warming up or unavailable (Render free tier cold start).' };
}

/** Get portfolio-level KPI summary. */
export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const res = await fetchWithFallback('/api/portfolio/summary');
  return res.json();
}

/** Get filtered list of loans. */
export async function getLoans(params?: {
  risk_tier?: string;
  loan_type?: string;
  search?: string;
}): Promise<{ loans: Loan[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.risk_tier && params.risk_tier !== 'ALL') qs.set('risk_tier', params.risk_tier);
  if (params?.loan_type && params.loan_type !== 'ALL') qs.set('loan_type', params.loan_type);
  if (params?.search) qs.set('search', params.search);

  const path = `/api/loans${qs.toString() ? '?' + qs.toString() : ''}`;
  const res = await fetchWithFallback(path);
  return res.json();
}

/** Get a single loan's full details. */
export async function getLoan(loanId: string): Promise<Loan> {
  const res = await fetchWithFallback(`/api/loans/${loanId}`);
  if (!res.ok) throw new Error(`Loan ${loanId} not found`);
  return res.json();
}

/** Submit an underwriter audit log for a loan. */
export async function submitAudit(loanId: string, entry: AuditEntry) {
  const res = await fetchWithFallback(`/api/loans/${loanId}/audit`, {
    method: 'POST',
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Audit submission failed');
  }
  return res.json();
}

/** Get all audit logs, optionally filtered by loan ID. */
export async function getAuditLogs(loanId?: string) {
  const path = loanId ? `/api/audits?loan_id=${loanId}` : '/api/audits';
  const res = await fetchWithFallback(path);
  return res.json();
}

/** Get model performance metrics. */
export async function getModelMetrics(): Promise<ModelMetrics> {
  const res = await fetchWithFallback('/api/model/metrics');
  return res.json();
}
